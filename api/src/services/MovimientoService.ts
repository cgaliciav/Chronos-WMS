/**
 * Casos de uso de movimientos (plan 02 §2.2-2.3, fase 3). Todo lo que toca InventarioActual + histórico +
 * Movimiento + MovimientoRelacion + Operacion (+ detalle, ProductoInventariado, grupo) ocurre en UNA transacción
 * cuya primera sentencia es `SELECT … FOR UPDATE` sobre `inventario_actual` (sin relaciones): dos operaciones
 * simultáneas sobre el mismo artículo se serializan (hallazgo C7).
 *
 * Sustituye a MovimientoController.guardarConOperacion / guardarConOperacionCompra / agregarOperacion / quitar y al
 * `switch` de actualizarInventarioActual.
 */
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import {
  esTipo,
  MovimientoTipoId as T,
  TIPOS_CON_SALDO,
  TIPOS_ENTRADA,
  TIPOS_ORIGEN,
  TIPOS_REGRESO,
  tiposAdmitidosEnListado,
} from "../entity/common/MovimientoTipoId";
import { Grupo } from "../entity/Grupo";
import { InventarioActual } from "../entity/InventarioActual";
import { InventarioActualHistorico } from "../entity/InventarioActualHistorico";
import { LogTipo } from "../entity/LogGeneral";
import { Movimiento } from "../entity/Movimiento";
import { MovimientoRelacion } from "../entity/MovimientoRelacion";
import { OperacionDetalle } from "../entity/OperacionDetalle";
import { Producto } from "../entity/Producto";
import { InventarioEstado, ProductoInventariado } from "../entity/ProductoInventariado";
import { Proyecto } from "../entity/Proyecto";
import { Sesion } from "../entity/Sesion";
import { AppError } from "../helpers/errorClases";
import { idOpcional, idSeguro } from "../helpers/ids";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { crearBaseOperacion } from "../controllers/Operacion.Controller";
import { aplicarEfecto, esInvertible, EstadoInventario, revertirEfecto } from "./reglas/efectosInventario";
import { OrigenAbierto, Plan, planificarRelaciones, RelacionSolicitada } from "./reglas/planificarRelaciones";
import { logger } from "../helpers/logger";

const redondear = (n: number) => Math.round(n * 10000) / 10000;

export interface DatosOperacion {
  tipo: number | string;
  cantidad: number | string;
  inventarioActualId: number | string;
  proyectoId?: number | string | null;
  usuariosIds?: (number | string)[] | null;
  sesionId: number;
  /** Listado al que se añade el movimiento nuevo. */
  grupoId?: number | string | null;
  /** Para PUT /groups/activity-add-transaction: movimiento existente (sin operación) al que se aplica. */
  movimientoId?: number | string | null;
  /** Orígenes elegidos por el cliente; si faltan, se reparte por FIFO (regla 6). */
  relaciones?: RelacionSolicitada[] | null;
  /** Con varias salidas candidatas y sin `relaciones`, responde 409 con las candidatas en lugar de usar FIFO. */
  strict?: boolean;
  /** Solo COMPRA (15): precios de la operación. */
  compra?: { precioUnitario: number | string; precioTotal: number | string; moneda?: string };
}

/** Acceso a datos que necesita `resolverRelaciones`; se sustituye en las pruebas unitarias. */
export interface ConsultasRelacion {
  origenesAbiertos(manager: EntityManager, inventarioActualId: number): Promise<OrigenAbierto[]>;
  pendienteLegado(manager: EntityManager, inventarioActualId: number, proyectoId: number | null): Promise<number>;
  nombreProyecto(manager: EntityManager, proyectoId: number | null): Promise<string | null>;
}

const lista = (tipos: number[]) => tipos.join(", "); // constantes numéricas propias, nunca datos del request

export const consultasRelacion: ConsultasRelacion = {
  async origenesAbiertos(manager, inventarioActualId) {
    const filas = await manager.query(
      `SELECT v.movimientoId, v.movimientoTipoId, v.proyectoId, p.nombre AS proyectoNombre, v.fecha, v.cantidad, v.saldo
         FROM v_movimiento_saldo v LEFT JOIN proyecto p ON p.id = v.proyectoId
        WHERE v.inventarioActualId = ? AND v.legado = 0 AND v.saldo > 0
        ORDER BY v.fecha, v.movimientoId`,
      [inventarioActualId]
    );
    return filas.map((f: any) => ({
      movimientoId: Number(f.movimientoId),
      movimientoTipoId: Number(f.movimientoTipoId),
      proyectoId: f.proyectoId === null ? null : Number(f.proyectoId),
      proyectoNombre: f.proyectoNombre,
      fecha: new Date(f.fecha),
      cantidad: Number(f.cantidad),
      saldo: Number(f.saldo),
    }));
  },

  /**
   * Heurística heredada (antes `aceptarDevolucionBaja`) limitada a lo que no cubren las relaciones: salidas legadas
   * del proyecto − regresos legados − la parte de regresos nuevos que se apoyó en saldo legado.
   */
  async pendienteLegado(manager, inventarioActualId, proyectoId) {
    if (proyectoId === null) return 0;
    const [fila] = await manager.query(
      `SELECT
         COALESCE(SUM(CASE WHEN m.legado = 1 AND o.movimientoTipoId IN (${lista(TIPOS_ORIGEN)}) THEN m.cantidad ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN m.legado = 1 AND o.movimientoTipoId IN (${lista(TIPOS_REGRESO)}) THEN m.cantidad ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN m.legado = 0 AND o.movimientoTipoId IN (${lista(TIPOS_REGRESO)})
                           THEN m.cantidad - (SELECT COALESCE(SUM(r.cantidad), 0) FROM movimiento_relacion r WHERE r.derivadoId = m.id)
                           ELSE 0 END), 0) AS pendiente
         FROM movimiento m INNER JOIN operacion o ON o.id = m.operacionId
        WHERE m.inventarioActualId = ? AND o.proyectoId = ?`,
      [inventarioActualId, proyectoId]
    );
    return Math.max(0, redondear(Number(fila?.pendiente ?? 0)));
  },

  async nombreProyecto(manager, proyectoId) {
    if (proyectoId === null) return null;
    const proyecto = await manager.findOne(Proyecto, { where: { id: proyectoId },  select: { id: true, nombre: true }, loadEagerRelations: false });
    return proyecto?.nombre ?? null;
  },
};

/** Texto de ProductoInventariado que registraba el `switch` anterior por tipo (null = no se registraba). */
const INVENTARIADO: Record<number, [string, InventarioEstado] | null> = {
  [T.COMPRA_LEGADO]: ["OPERACION COMPRA", InventarioEstado.INVENTARIO_POSITIVO],
  [T.COMPRA]: ["OPERACION COMPRA", InventarioEstado.INVENTARIO_POSITIVO],
  [T.ALTA_LEGADO]: ["OPERACION ALTA", InventarioEstado.INVENTARIO_POSITIVO],
  [T.ALTA]: ["OPERACION ALTA", InventarioEstado.INVENTARIO_POSITIVO],
  [T.BAJA_EN_INVENTARIO]: ["OPERACION BAJA", InventarioEstado.INVENTARIO_NEGATIVO],
  [T.BAJA_ADMINISTRADOR]: ["OPERACION BAJA", InventarioEstado.INVENTARIO_NEGATIVO],
  [T.BAJA_LEGADO]: ["OPERACION BAJA", InventarioEstado.INVENTARIO_NEGATIVO],
  [T.BAJA_JUSTIFICADA]: ["OPERACION BAJA", InventarioEstado.INVENTARIO_NEGATIVO],
  [T.BAJA_INJUSTIFICADA]: ["OPERACION BAJA", InventarioEstado.INVENTARIO_NEGATIVO],
  [T.PRESTAMO]: ["OPERACION PRESTAMO", InventarioEstado.INVENTARIO_POSITIVO],
  [T.DEVOLUCION]: ["OPERACION DEVOLUCION", InventarioEstado.INVENTARIO_POSITIVO],
  [T.RENTA_EXTERNA]: ["OPERACION RENTA EXTERNA", InventarioEstado.INVENTARIO_POSITIVO],
};

const advertir = (mensaje: string, datos: unknown) => {
  logger.warn(mensaje, datos);
  LogGeneralController.InsertarLog(LogTipo.WARN, mensaje, datos);
};

/** Bloquea la fila del inventario (FOR UPDATE, sin relaciones) y devuelve la entidad y su productoId. */
const bloquearInventario = async (manager: EntityManager, inventarioActualId: number) => {
  const { entities, raw } = await manager
    .createQueryBuilder(InventarioActual, "ia")
    .setLock("pessimistic_write")
    .where("ia.id = :id", { id: inventarioActualId })
    .getRawAndEntities();
  if (entities.length === 0) throw new AppError(`No existe el inventario ${inventarioActualId}`, 404);
  return { inventario: entities[0], productoId: raw[0].ia_productoId as number | null };
};

const estadoDe = (inv: InventarioActual): EstadoInventario => ({
  cantidad: Number(inv.cantidad),
  cantidadAlmacen: Number(inv.cantidadAlmacen),
  disponible: inv.disponible,
});

/**
 * `estatus` (@deprecated, lo lee el front): el último movimiento CON operación del inventario queda `activo`
 * y el resto de los activos pasa a `inactivo`. Se guarda entidad por entidad para conservar la auditoría.
 */
const recalcularEstatus = async (manager: EntityManager, inventarioActualId: number, sesionId: number) => {
  const [ultimo] = await manager.query(
    "SELECT id FROM movimiento WHERE inventarioActualId = ? AND operacionId IS NOT NULL ORDER BY id DESC LIMIT 1",
    [inventarioActualId]
  );
  const ultimoId = ultimo ? Number(ultimo.id) : null;
  const activos = await manager
    .createQueryBuilder(Movimiento, "m")
    .where("m.inventarioActualId = :id", { id: inventarioActualId })
    .andWhere("(m.estatus = :activo OR m.id = :ultimoId)", { activo: EstatusEstado.ACTIVO, ultimoId: ultimoId ?? 0 })
    .getMany();
  for (const mov of activos) {
    const estatus = mov.id === ultimoId ? EstatusEstado.ACTIVO : EstatusEstado.INACTIVO;
    if (mov.estatus !== estatus) {
      mov.estatus = estatus;
      mov.sesionId = sesionId;
      await manager.save(mov);
    }
  }
};

const registrarInventariado = async (manager: EntityManager, tipo: number, productoId: number | null, sesionId: number) => {
  const datos = INVENTARIADO[tipo];
  if (!datos || productoId === null) return;
  const registro = new ProductoInventariado();
  registro.estatus = EstatusEstado.ACTIVO;
  registro.producto = { id: productoId } as Producto;
  registro.validacion = datos[1];
  registro.sesionId = sesionId;
  registro.sesion = { id: sesionId } as Sesion;
  registro.nombre = `${datos[0]}>>>${Math.trunc(Math.random() * 10000000000000)}`;
  await manager.save(registro);
};

/** Última instantánea SIN movimiento ligado (anteriores a la fase 3) de un inventario. */
const ultimaInstantaneaLegada = (manager: EntityManager, inventarioActualId: number) =>
  manager
    .createQueryBuilder(InventarioActualHistorico, "h")
    .where("h.idOriginal = :id", { id: inventarioActualId })
    .andWhere("h.movimientoId IS NULL")
    .orderBy("h.id", "DESC")
    .getOne();

/**
 * Todas las líneas de un listado son del tipo del listado (decisión 11). Se comprueba el listado al que se añade el
 * movimiento y, para PUT /groups/activity-add-transaction, los listados que ya lo contienen. Los listados sin detalle
 * (listas libres) no restringen el tipo.
 */
const exigirTipoDelListado = async (manager: EntityManager, tipo: number, grupoId?: number, movimientoId?: number) => {
  const listados: { grupo: string; tipo: number; nombre: string }[] = [];
  const columnas = "g.nombre AS grupo, gd.movimientoTipoId AS tipo, mt.nombre AS nombre";
  const unir = "INNER JOIN grupo_detalle gd ON gd.id = g.grupoDetalleId INNER JOIN movimiento_tipo mt ON mt.id = gd.movimientoTipoId";
  if (grupoId !== undefined) {
    listados.push(...(await manager.query(`SELECT ${columnas} FROM grupo g ${unir} WHERE g.id = ?`, [grupoId])));
  }
  if (movimientoId !== undefined) {
    listados.push(
      ...(await manager.query(
        `SELECT ${columnas} FROM grupo_movimientos_movimiento gm INNER JOIN grupo g ON g.id = gm.grupoId ${unir} WHERE gm.movimientoId = ?`,
        [movimientoId]
      ))
    );
  }
  const distinto = listados.find((l) => !tiposAdmitidosEnListado(Number(l.tipo)).includes(tipo));
  if (distinto) {
    throw new AppError(`El listado ${distinto.grupo} es de ${distinto.nombre}: solo admite movimientos de ese tipo`, 400);
  }
};

/** Ejecuta `fn` en una transacción READ COMMITTED (cada lectura ve lo confirmado tras obtener el bloqueo). */
const enTransaccion = <R>(fn: (manager: EntityManager) => Promise<R>, manager?: EntityManager): Promise<R> =>
  manager ? fn(manager) : AppDataSource.transaction("READ COMMITTED", fn);

export default class MovimientoService {
  static enTransaccion = enTransaccion;

  /**
   * Decide las relaciones origen→derivado de un movimiento (reglas 1-6 y modo de compatibilidad, regla 8).
   * Debe llamarse con el inventario ya bloqueado.
   */
  static resolverRelaciones = async (
    manager: EntityManager,
    datos: { inventarioActualId: number; proyectoId: number | null; tipo: number; cantidad: number; relaciones?: RelacionSolicitada[] | null; strict?: boolean },
    consultas: ConsultasRelacion = consultasRelacion
  ): Promise<Plan> => {
    const necesitaDatos = esTipo(TIPOS_REGRESO, datos.tipo) || datos.tipo === T.TRANSFERENCIA_DESTINO || esTipo([T.BAJA_EN_INVENTARIO, T.BAJA_ADMINISTRADOR], datos.tipo);
    if (!necesitaDatos) {
      return planificarRelaciones({ ...datos, abiertos: [], pendienteLegado: 0 });
    }
    const abiertos = await consultas.origenesAbiertos(manager, datos.inventarioActualId);
    const pendienteLegado = esTipo(TIPOS_REGRESO, datos.tipo)
      ? await consultas.pendienteLegado(manager, datos.inventarioActualId, datos.proyectoId)
      : 0;
    const proyectoNombre = esTipo(TIPOS_REGRESO, datos.tipo) ? await consultas.nombreProyecto(manager, datos.proyectoId) : null;
    return planificarRelaciones({ ...datos, abiertos, pendienteLegado, proyectoNombre });
  };

  /** Saldo pendiente de un movimiento con saldo (orígenes y 7); null para los demás tipos. */
  static saldoPendiente = async (movimientoId: number | string, manager: EntityManager = AppDataSource.manager) => {
    const [fila] = await manager.query("SELECT saldo, legado FROM v_movimiento_saldo WHERE movimientoId = ?", [idSeguro(movimientoId, "movimientoId")]);
    if (!fila) return null;
    return Number(fila.legado) === 1 ? null : Number(fila.saldo); // los legados no tienen relaciones: su saldo no es fiable
  };

  /**
   * Registra una operación: valida el efecto sobre el inventario, resuelve las relaciones y guarda instantánea,
   * operación, movimiento, relaciones, estatus, ProductoInventariado y grupo en una sola transacción.
   * Pasa `manager` para participar en una transacción ya abierta (p. ej. al crear el artículo en una compra).
   */
  static registrarOperacion = async (datos: DatosOperacion, managerExterno?: EntityManager): Promise<Movimiento> => {
    const tipo = idSeguro(datos.tipo, "movimientoTipoId");
    const cantidad = Number(datos.cantidad);
    const proyectoId = idOpcional(datos.proyectoId, "proyectoId") ?? null;
    const sesionId = datos.sesionId;
    if (tipo === T.COMPRA && datos.compra === undefined) throw new AppError("La COMPRA requiere precios", 400);
    if (tipo !== T.COMPRA && datos.compra !== undefined) throw new AppError("Solo la COMPRA lleva precios", 400);

    // Lecturas de catálogo fuera del bloqueo (tipo, proyecto, usuarios): no dependen del inventario.
    const operacion = await crearBaseOperacion(tipo, proyectoId ?? undefined, datos.usuariosIds ?? undefined, sesionId);
    const inventarioActualId = idSeguro(datos.inventarioActualId, "inventarioActualId");
    const movimientoExistenteId = idOpcional(datos.movimientoId, "movimientoId");

    const movimientoId = await enTransaccion(async (manager) => {
      const { inventario, productoId } = await bloquearInventario(manager, inventarioActualId);
      await exigirTipoDelListado(manager, tipo, idOpcional(datos.grupoId, "grupoId"), movimientoExistenteId);

      let movimiento: Movimiento;
      if (movimientoExistenteId !== undefined) {
        const [fila] = await manager.query("SELECT inventarioActualId, operacionId FROM movimiento WHERE id = ?", [movimientoExistenteId]);
        if (!fila) throw new AppError(`No existe el movimiento ${movimientoExistenteId}`, 404);
        if (Number(fila.inventarioActualId) !== inventarioActualId) throw new AppError("El movimiento no pertenece a este inventario", 409);
        if (fila.operacionId !== null) throw new AppError("El movimiento ya tiene una operación", 400);
        movimiento = await manager.findOneOrFail(Movimiento, { where: { id: movimientoExistenteId },  loadEagerRelations: false });
      } else {
        movimiento = new Movimiento();
      }
      movimiento.cantidad = cantidad;

      const nuevoEstado = aplicarEfecto(tipo, estadoDe(inventario), cantidad);
      const plan = await MovimientoService.resolverRelaciones(manager, {
        inventarioActualId,
        proyectoId,
        tipo,
        cantidad,
        relaciones: datos.relaciones,
        strict: datos.strict,
      });

      if (datos.compra !== undefined) {
        const detalle = new OperacionDetalle();
        detalle.precioUnitario = Number(datos.compra.precioUnitario ?? 0);
        detalle.precioTotal = Number(datos.compra.precioTotal ?? 0);
        detalle.moneda = datos.compra.moneda ?? "MXP";
        detalle.sesionId = sesionId;
        operacion.operacionDetalle = await manager.save(detalle);
      }
      await manager.save(operacion);

      movimiento.inventarioActual = { id: inventarioActualId } as InventarioActual;
      movimiento.operacion = operacion;
      movimiento.sesion = { id: sesionId } as Sesion;
      movimiento.sesionId = sesionId;
      movimiento.legado = false;
      movimiento.estatus = EstatusEstado.ACTIVO;
      await manager.save(movimiento);

      // Instantánea del estado ANTERIOR, ligada al movimiento (hallazgo H17).
      const historico = new InventarioActualHistorico();
      historico.cantidad = inventario.cantidad;
      historico.cantidadAlmacen = inventario.cantidadAlmacen;
      historico.disponible = inventario.disponible;
      historico.estatus = inventario.estatus;
      historico.fechaDisponibilidad = inventario.fechaDisponibilidad;
      historico.idOriginal = inventario.id;
      historico.movimiento = { id: movimiento.id } as Movimiento;
      historico.sesionId = sesionId;
      await manager.save(historico);

      inventario.cantidad = nuevoEstado.cantidad;
      inventario.cantidadAlmacen = nuevoEstado.cantidadAlmacen;
      inventario.disponible = nuevoEstado.disponible;
      inventario.sesionId = sesionId;
      await manager.save(inventario);

      if (plan.relaciones.length > 0) {
        await manager.save(
          plan.relaciones.map((r) => {
            const relacion = new MovimientoRelacion();
            relacion.origen = { id: r.origenId } as Movimiento;
            relacion.derivado = { id: movimiento.id } as Movimiento;
            relacion.cantidad = r.cantidad;
            relacion.tipo = r.tipo;
            relacion.sesionId = sesionId;
            return relacion;
          })
        );
      }

      await recalcularEstatus(manager, inventarioActualId, sesionId);
      await registrarInventariado(manager, tipo, productoId, sesionId);

      const grupoId = idOpcional(datos.grupoId, "grupoId");
      if (grupoId !== undefined) {
        await manager.findOneOrFail(Grupo, { where: { id: grupoId },  select: { id: true }, loadEagerRelations: false });
        await manager.createQueryBuilder().relation(Grupo, "movimientos").of(grupoId).add(movimiento.id);
      }

      if (plan.cubiertoPorLegado > 0) {
        advertir("Modo de compatibilidad: movimiento aplicado contra saldo legado sin relación (plan 02 regla 8)", {
          movimientoId: movimiento.id, inventarioActualId, proyectoId, tipo, cantidad, cubiertoPorLegado: plan.cubiertoPorLegado,
        });
      }
      if (plan.sinOrigen) {
        advertir("TRANSFERENCIA DESTINO sin transferencia origen abierta: se registra sin relación", {
          movimientoId: movimiento.id, inventarioActualId, cantidad,
        });
      }
      return movimiento.id;
    }, managerExterno);

    const manager = managerExterno ?? AppDataSource.manager;
    // Misma forma que devolvía el API antes (operación, inventario, sesión) + relaciones como derivado.
    // Las relaciones se cargan aparte: anidar `relacionesComoDerivado.origen` con las relaciones eager de
    // Movimiento genera alias demasiado largos en TypeORM 0.2.
    const movimiento = await manager.findOneOrFail(Movimiento, { where: { id: movimientoId }, 
      relations: { operacion: { operacionDetalle: true, usuarios: true } },
    });
    movimiento.relacionesComoDerivado = await manager
      .createQueryBuilder(MovimientoRelacion, "r")
      .leftJoin("r.origen", "origen")
      .addSelect("origen.id")
      .where("r.derivadoId = :id", { id: movimientoId })
      .orderBy("r.id")
      .getMany();
    return movimiento;
  };

  /**
   * Deshace un movimiento (DELETE /groups/activity). Reglas:
   *  - 409 si es ORIGEN de alguna relación (deshaga antes sus derivados).
   *  - Sus relaciones como derivado se borran (CASCADE) y el saldo de sus orígenes se recupera.
   *  - Salidas, regresos y altas se deshacen con su efecto inverso aunque no sean el último movimiento.
   *  - Compras y bajas (fijan valores absolutos) solo si son el último movimiento con operación: se restaura la
   *    instantánea LIGADA a ese movimiento (o, para movimientos legados, la última instantánea del inventario).
   *  - 409 si después hay una compra o baja (deshágala primero).
   */
  static deshacer = async (movimientoId: number | string, sesionId: number) => {
    const id = idSeguro(movimientoId, "movimientoId");
    // Se lee fuera de la transacción solo para saber qué inventario bloquear; dentro se vuelve a leer.
    const [previo] = await AppDataSource.query("SELECT inventarioActualId FROM movimiento WHERE id = ?", [id]);
    if (!previo) throw new AppError("Movimiento desconocido", 400);
    const inventarioActualId = Number(previo.inventarioActualId);

    return enTransaccion(async (manager) => {
      const { inventario } = await bloquearInventario(manager, inventarioActualId);
      const movimiento = await manager.findOne(Movimiento, { where: { id: id }, 
        relations: { operacion: { movimientoTipo: true, operacionDetalle: true } },
        loadEagerRelations: false,
      });
      if (!movimiento) throw new AppError("Movimiento desconocido", 400);
      movimiento.sesionId = sesionId;

      const derivados = await manager.query("SELECT derivadoId, cantidad, tipo FROM movimiento_relacion WHERE origenId = ?", [id]);
      if (derivados.length > 0) {
        throw new AppError("No se puede deshacer: otros movimientos dependen de este. Deshaga primero sus derivados.", 409, {
          derivados: derivados.map((d: any) => ({ movimientoId: Number(d.derivadoId), cantidad: Number(d.cantidad), tipo: d.tipo })),
        });
      }

      const operacion = movimiento.operacion;
      if (!operacion) {
        await manager.remove(movimiento); // movimiento de listado sin operación: no afecta al inventario
        return { id };
      }
      const tipo = Number(operacion.movimientoTipo.id);
      const posteriores: { id: number; tipo: number }[] = (
        await manager.query(
          `SELECT m.id, o.movimientoTipoId AS tipo FROM movimiento m INNER JOIN operacion o ON o.id = m.operacionId
            WHERE m.inventarioActualId = ? AND m.id > ? ORDER BY m.id`,
          [inventarioActualId, id]
        )
      ).map((f: any) => ({ id: Number(f.id), tipo: Number(f.tipo) }));
      const bloqueante = posteriores.find((p) => !esInvertible(p.tipo));
      if (bloqueante) {
        throw new AppError(`No se puede deshacer: después hay una compra o baja (movimiento ${bloqueante.id}); deshágala primero`, 409);
      }

      const ligadas = await manager
        .createQueryBuilder(InventarioActualHistorico, "h")
        .where("h.movimientoId = :id", { id })
        .orderBy("h.id", "DESC")
        .getMany();
      const instantaneasABorrar = [...ligadas];

      let nuevo: Partial<InventarioActual> | null;
      if (esInvertible(tipo)) {
        nuevo = revertirEfecto(tipo, estadoDe(inventario), Number(movimiento.cantidad));
        if (movimiento.legado && posteriores.length === 0) {
          // Mantiene alineada la pila de instantáneas heredada (la usaba el `quitar` anterior).
          const legada = await ultimaInstantaneaLegada(manager, inventarioActualId);
          if (legada) instantaneasABorrar.push(legada);
        }
      } else {
        if (posteriores.length > 0) {
          throw new AppError("Las compras y bajas solo se pueden deshacer si son el último movimiento del artículo", 409);
        }
        const instantanea = ligadas[0] ?? (movimiento.legado ? await ultimaInstantaneaLegada(manager, inventarioActualId) : undefined);
        if (instantanea) {
          if (!ligadas.includes(instantanea)) instantaneasABorrar.push(instantanea);
          nuevo = {
            cantidad: instantanea.cantidad,
            cantidadAlmacen: instantanea.cantidadAlmacen,
            disponible: instantanea.disponible,
            estatus: instantanea.estatus,
            fechaDisponibilidad: instantanea.fechaDisponibilidad,
          };
        } else {
          nuevo = null;
          advertir("Deshacer sin instantánea: el inventario no se modifica (movimiento legado)", { movimientoId: id, inventarioActualId, tipo });
        }
      }

      for (const instantanea of instantaneasABorrar) {
        instantanea.sesionId = sesionId;
        await manager.remove(instantanea);
      }
      if (nuevo) {
        Object.assign(inventario, nuevo);
        inventario.sesionId = sesionId;
        await manager.save(inventario);
      }

      const detalle = operacion.operacionDetalle;
      await manager.remove(movimiento); // sus relaciones como derivado se borran en cascada
      operacion.sesionId = sesionId;
      await manager.remove(operacion);
      if (detalle) {
        detalle.sesionId = sesionId;
        await manager.remove(detalle);
      }
      await recalcularEstatus(manager, inventarioActualId, sesionId);
      return { id };
    });
  };

  /** Movimiento con sus relaciones en ambos sentidos y su saldo pendiente (GET /activity/:id/chain). */
  static cadena = async (movimientoId: number | string) => {
    const id = idSeguro(movimientoId, "movimientoId");
    const movimiento = await AppDataSource.getRepository(Movimiento)
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.operacion", "o")
      .leftJoinAndSelect("o.movimientoTipo", "t")
      .leftJoinAndSelect("o.proyecto", "p")
      .leftJoinAndSelect("m.relacionesComoDerivado", "rd")
      .leftJoinAndSelect("rd.origen", "rdo")
      .leftJoinAndSelect("rdo.operacion", "rdoo")
      .leftJoinAndSelect("rdoo.movimientoTipo", "rdot")
      .leftJoinAndSelect("rdoo.proyecto", "rdop")
      .leftJoinAndSelect("m.relacionesComoOrigen", "ro")
      .leftJoinAndSelect("ro.derivado", "rod")
      .leftJoinAndSelect("rod.operacion", "rodo")
      .leftJoinAndSelect("rodo.movimientoTipo", "rodt")
      .leftJoinAndSelect("rodo.proyecto", "rodp")
      .where("m.id = :id", { id })
      .orderBy("rd.id")
      .addOrderBy("ro.id")
      .getOne();
    if (!movimiento) throw new AppError(`No existe el movimiento ${id}`, 404);
    const { relacionesComoDerivado, relacionesComoOrigen, ...resto } = movimiento;
    return {
      movimiento: resto,
      relacionesComoDerivado: relacionesComoDerivado.map((r) => ({ id: r.id, origen: r.origen, cantidad: r.cantidad, tipo: r.tipo, fecha: r.fecha })),
      relacionesComoOrigen: relacionesComoOrigen.map((r) => ({ id: r.id, derivado: r.derivado, cantidad: r.cantidad, tipo: r.tipo, fecha: r.fecha })),
      saldoPendiente: await MovimientoService.saldoPendiente(id),
    };
  };

  /** Salidas con saldo pendiente de un inventario (GET /activity/open-by-inventory/:id?proyectoId=). Excluye legados. */
  static abiertosPorInventario = async (inventarioActualId: number | string, proyectoId?: number | string | null) => {
    const inventario = idSeguro(inventarioActualId, "inventarioActualId");
    const proyecto = idOpcional(proyectoId, "proyectoId");
    const filas = await AppDataSource.query(
      `SELECT v.movimientoId, v.movimientoTipoId, t.nombre AS movimientoTipo, v.proyectoId, p.nombre AS proyecto,
              v.fecha, v.cantidad, v.aplicado, v.saldo
         FROM v_movimiento_saldo v
         LEFT JOIN proyecto p ON p.id = v.proyectoId
         LEFT JOIN movimiento_tipo t ON t.id = v.movimientoTipoId
        WHERE v.inventarioActualId = ? AND v.legado = 0 AND v.saldo > 0
          AND v.movimientoTipoId IN (${lista(TIPOS_CON_SALDO)})
          ${proyecto !== undefined ? "AND v.proyectoId = ?" : ""}
        ORDER BY v.fecha, v.movimientoId`,
      proyecto !== undefined ? [inventario, proyecto] : [inventario]
    );
    return filas.map((f: any) => ({
      movimientoId: Number(f.movimientoId),
      movimientoTipoId: Number(f.movimientoTipoId),
      movimientoTipo: f.movimientoTipo,
      proyectoId: f.proyectoId === null ? null : Number(f.proyectoId),
      proyecto: f.proyecto,
      fecha: f.fecha,
      cantidad: Number(f.cantidad),
      aplicado: Number(f.aplicado),
      saldo: Number(f.saldo),
    }));
  };

  /** Tipos que crean el artículo: solo se registran desde PUT /groups/activity-purchase. */
  static esTipoDeEntrada = (tipo: number | string | undefined | null) => esTipo(TIPOS_ENTRADA, tipo);
}

