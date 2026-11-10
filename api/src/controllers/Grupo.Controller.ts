import { NextFunction, Request, Response } from "express";
import {
  Brackets,
  getConnection,
  getRepository,
  SelectQueryBuilder,
} from "typeorm";
import { Grupo } from "../entity/Grupo";
import {
  InventarioActual,
  InventarioDisponible,
} from "../entity/InventarioActual";
import { Movimiento } from "../entity/Movimiento";
import { Sesion } from "../entity/Sesion";
import { AppError } from "../helpers/errorClases";
import { andWhereIn, aplicarFiltros, columnaSegura, construirFiltros, direccionSegura } from "../helpers/filtrosTabla";
import { idSeguro, idsSeguros, parametro } from "../helpers/ids";
import CommonController from "./common/Common.Controller";
import GrupoDetalleController from "./GrupoDetalle.Controller";
import InventarioActualController, {
  crearBaseInventarioActual,
  queryBusquedaCatalogo,
  queryBusquedaCodigos,
  queryBusquedaProyecto,
} from "./InventarioActual.Controller";
import MovimientoController from "./Movimiento.Controller";
import MovimientoService from "../services/MovimientoService";
import { exigirProyectoEditable } from "../services/guardasRelacion";
import { MovimientoTipoId as T, TIPOS_ORIGEN, tiposAdmitidosEnListado } from "../entity/common/MovimientoTipoId";
import ProductoController from "./Producto.Controller";
import { autogenerarCodigo } from "./ProductoClave.Controller";

// Filtros de las tablas antd, parametrizados (hallazgos C1/C3). Las llaves traen alias ("grupo.nombre", "proyecto.id").
const condicionesWhereAnd = (filters: any) => construirFiltros(filters, { textuales: /nombre|barras|titulo/, fechas: /fecha/ });

const funcionQueryListado = () => {
  return getRepository(Grupo)
    .createQueryBuilder("grupo")
    .leftJoinAndSelect("grupo.sesion", "sesion")
    .leftJoinAndSelect("sesion.usuario", "usuario")
    .leftJoin("grupo.movimientos", "movimientos")
    .addSelect("movimientos.id") // <<-- para poder contar cuantos movimientos tiene el grupo en el listado
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("grupoDetalle.proyecto", "proyecto")
    .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
    .leftJoinAndSelect("grupoDetalle.usuarios", "usuarios")
    .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")
    .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo");

  // .leftJoinAndSelect("grupo.movimientos","movimientos")
  // .leftJoinAndSelect("grupo.comentarios","comentarios")
  // .leftJoin("grupo.archivos","archivos")
  // .addSelect(['archivos.id','archivos.nombre','archivos.tipoMIME',,'archivos.tipo','archivos.tipoMIME','archivos.orden','archivos.nota'])
  // .leftJoin("comentarios.sesion","sesionComentarios")
  // .leftJoin("sesionComentarios.usuario","usuario")
  // .addSelect("usuario.nombre")
};

const funcionQueryListadoPorTipoMovimiento = (
  movimientoTipoId: number | string
) => {
  return getRepository(Grupo)
    .createQueryBuilder("grupo")
    .leftJoinAndSelect("grupo.sesion", "sesion")
    .leftJoinAndSelect("sesion.usuario", "usuario")
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
    .leftJoin("grupo.movimientos", "movimientos")
    .addSelect("movimientos.id") // <<-- para poder contar cuantos movimientos tiene el grupo en el listado
    .where("movimientoTipo.id=:movimientoTipoId", { movimientoTipoId });
  // .leftJoinAndSelect("grupo.movimientos","movimientos")
  // .leftJoinAndSelect("grupo.comentarios","comentarios")
  // .leftJoin("grupo.archivos","archivos")
  // .addSelect(['archivos.id','archivos.nombre','archivos.tipoMIME',,'archivos.tipo','archivos.tipoMIME','archivos.orden','archivos.nota'])
  // .leftJoin("comentarios.sesion","sesionComentarios")
  // .leftJoin("sesionComentarios.usuario","usuario")
  // .addSelect("usuario.nombre")
};

// Antes: `if (key.indexOf("nombre") || key.indexOf("correo"))` trataba CUALQUIER llave como LIKE (hallazgo M23).
const condicionesWhereAndPrestamosActivos = (filters: any) =>
  construirFiltros(filters, { textuales: /nombre|correo|barras|titulo/, fechas: /fecha/ });

const funcionQueryId = (id: number | string) => {
  return (
    getRepository(Grupo)
      .createQueryBuilder("grupo")
      // .leftJoinAndSelect("grupo.movimientos","movimientos")
      .leftJoinAndSelect("grupo.sesion", "sesionGrupo")
      // .addSelect("sesionGrupo.id")
      .leftJoinAndSelect("sesionGrupo.usuario", "usuarioGrupo")
      // .addSelect("usuarioGrupo.nombre")
      .leftJoinAndSelect("grupo.comentarios", "comentarios")
      .leftJoin("grupo.archivos", "archivos")
      .addSelect(["archivos.id"])
      .leftJoinAndSelect("comentarios.sesion", "sesionComentarios")
      // .addSelect("sesionComentarios.id")
      .leftJoinAndSelect("sesionComentarios.usuario", "usuario")
      // .addSelect("usuario.nombre")
      .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
      // .addSelect("grupoDetalle.id")
      .leftJoinAndSelect("grupoDetalle.proyecto", "proyecto")
      // .addSelect(["proyecto.nombre","esExterno"])
      .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
      // .addSelect(["movimientoTipo.id","movimientoTipo.nombre"])
      .leftJoinAndSelect("grupoDetalle.usuarios", "usuarios")
      // .addSelect(["usuarios.nombre"])
      .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
      // .addSelect(["facturaDetalle.id","facturaDetalle.numero","facturaDetalle.fechaEmision","facturaDetalle.total","facturaDetalle.impuestos","facturaDetalle.montoIngresado"])
      .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")
      // .addSelect(["proveedor.nombre","proveedor.id"])
      .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo")
      // .addSelect(["facturaTipo.nombre","facturaTipo.id"])
      .leftJoinAndSelect("grupoDetalle.inventarioDetalle", "inventarioDetalle")
      // .addSelect(["inventarioDetalle.id","inventarioDetalle.fechaInicio","inventarioDetalle.fechaFin"])
      .leftJoinAndSelect("inventarioDetalle.bodega", "bodega")
      // .addSelect(["bodega.nombre","bodega.id"])
      .where("grupo.id = :id", { id })
      .orderBy("comentarios.id", "DESC")
  );
};

const obtenerMovimientosConInventarioActual = async (
  grupoId: number | string
) =>
  await getRepository(Movimiento)
    .createQueryBuilder("movimientos")
    .innerJoinAndSelect("movimientos.grupos", "grupos")
    .leftJoinAndSelect("movimientos.inventarioActual", "inventarioActual")
    .where("grupos.id =:grupoId", { grupoId })
    .getMany();

const obtenerMovimientosConOperacionConInventarioActual = async (
  grupoId: number | string
) =>

  getRepository(Grupo)
    .createQueryBuilder("grupo")
    .leftJoinAndSelect("grupo.movimientos", "movimientos")
    .leftJoinAndSelect("movimientos.operacion", "operacionMovimientos")
    .leftJoinAndSelect("movimientos.inventarioActual", "inventarioActual")
    .leftJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoinAndSelect("producto.productoPrecios", "productoPrecios")
    .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
    .leftJoinAndSelect("operacionMovimientos.operacionDetalle", "operacionDetalle")
    .leftJoinAndSelect("operacionMovimientos.comentarios", "movimientosComentarios")
    .leftJoinAndSelect("movimientosComentarios.sesion", "movimientosComentariosSesion")
    .leftJoinAndSelect("movimientosComentariosSesion.usuario", "movimientosComentariosSesionUsuario")
    .leftJoin("operacionMovimientos.archivos", "archivosComentarios")
    .addSelect(["archivosComentarios.id"])
    .leftJoinAndSelect("grupo.sesion", "sesionGrupo")
    .leftJoinAndSelect("sesionGrupo.usuario", "usuarioGrupo")
    .leftJoinAndSelect("grupo.comentarios", "comentarios")
    .leftJoin("grupo.archivos", "archivos")
    .addSelect(["archivos.id"])
    .leftJoinAndSelect("comentarios.sesion", "sesionComentarios")
    .leftJoinAndSelect("sesionComentarios.usuario", "usuario")
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.proyecto", "proyecto")
    .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("grupoDetalle.usuarios", "usuarios")
    .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
    .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")
    .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo")
    .leftJoinAndSelect("grupoDetalle.inventarioDetalle", "inventarioDetalle")
    .leftJoinAndSelect("inventarioDetalle.bodega", "bodega")
    .where("grupo.id = :grupoId", { grupoId })
    .getOne();


const obtenerMovimientosConOperacionDeGrupo = async (
  grupoId: number | string
) =>
  await getRepository(Movimiento)
    .createQueryBuilder("movimientos")
    .innerJoinAndSelect("movimientos.grupos", "grupos")
    .leftJoinAndSelect("movimientos.operacion", "operacion")
    .leftJoinAndSelect("operacion.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("operacion.proyecto", "proyecto")
    .leftJoinAndSelect("operacion.operacionDetalle", "operacionDetalle")
    .leftJoinAndSelect("operacion.usuarios", "usuarios")
    .where("grupos.id =:grupoId", { grupoId })
    .getMany();

/**
 * Préstamos (y compras, rentas, transferencias) pendientes de regreso (plan 02 fase 3, paso 8):
 *  - Movimientos nuevos: salidas con saldo > 0 en `v_movimiento_saldo`; una fila por salida abierta.
 *  - Inventarios que solo tienen movimientos legados (sin relaciones): heurística anterior, el último movimiento
 *    `activo` de cada producto con el inventario `no-disponible`.
 * Mismos filtros que antes en ambas ramas (proyecto, usuarios de la operación, áreas). `bodegasIds` no se usaba.
 */
const funcionQueryListadoPrestamosPendientes = (
  proyectoId: number | string,
  usuariosIds: (number | string)[],
  areasIds: (number | string)[],
  bodegasIds: (number | string)[]
) => {
  const areas = areasIds?.length > 0 ? idsSeguros(areasIds, "areasIds") : undefined;
  const proyecto = proyectoId && proyectoId !== "0" && proyectoId !== 0 ? idSeguro(proyectoId, "proyectoId") : undefined;
  const usuarios = usuariosIds?.length > 0 ? idsSeguros(usuariosIds, "usuariosIds") : undefined;
  const aplicarFiltrosComunes = (qb: SelectQueryBuilder<any>) => {
    if (areas) qb.andWhere("p.areaId IN (:...pp_areasIds)", { pp_areasIds: areas });
    if (proyecto !== undefined) qb.andWhere("o.proyectoId = :pp_proyectoId", { pp_proyectoId: proyecto });
    if (usuarios) {
      qb.andWhere("o.id IN (SELECT ou.operacionId FROM operacion_usuarios_usuario ou WHERE ou.usuarioId IN (:...pp_usuariosIds))", {
        pp_usuariosIds: usuarios,
      });
    }
    return qb;
  };

  const nuevos = aplicarFiltrosComunes(
    getConnection()
      .createQueryBuilder()
      .select("v.movimientoId")
      .from("v_movimiento_saldo", "v")
      .innerJoin("movimiento", "mv", "mv.id = v.movimientoId")
      .innerJoin("operacion", "o", "o.id = mv.operacionId")
      .innerJoin("inventario_actual", "ia", "ia.id = v.inventarioActualId")
      .innerJoin("producto", "p", "p.id = ia.productoId")
      .where("v.legado = 0")
      .andWhere("v.saldo > 0")
      .andWhere(`v.movimientoTipoId IN (${TIPOS_ORIGEN.join(", ")})`)
  );

  const rankeados = aplicarFiltrosComunes(
    getConnection()
      .createQueryBuilder()
      .select("m.id", "movimientoId")
      .addSelect("ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY o.fecha DESC)", "rn")
      .from("movimiento", "m")
      .innerJoin("operacion", "o", "o.id = m.operacionId")
      .innerJoin("inventario_actual", "ia", "ia.id = m.inventarioActualId")
      .innerJoin("producto", "p", "p.id = ia.productoId")
      .where("m.estatus = 'activo'")
      .andWhere("ia.disponible = 'no-disponible'")
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM movimiento mn INNER JOIN operacion onn ON onn.id = mn.operacionId
                      WHERE mn.inventarioActualId = ia.id AND mn.legado = 0 AND onn.movimientoTipoId IN (${TIPOS_ORIGEN.join(", ")}))`
      )
  );
  const legados = getConnection()
    .createQueryBuilder()
    .select("rk.movimientoId")
    .from("(" + rankeados.getQuery() + ")", "rk")
    .where("rk.rn = 1");

  return funcionQueryListadoMovimientos()
    .where(`(movimiento.id IN (${nuevos.getQuery()}) OR movimiento.id IN (${legados.getQuery()}))`)
    .setParameters({ ...nuevos.getParameters(), ...rankeados.getParameters() });
};

/** Añade `saldoPendiente` (null para movimientos legados) a cada movimiento de un listado. */
const conSaldoPendiente = async (movimientos: Movimiento[]) => {
  if (movimientos.length === 0) return movimientos;
  const filas = await getConnection().query(
    "SELECT movimientoId, saldo, legado FROM v_movimiento_saldo WHERE movimientoId IN (?)",
    [movimientos.map((m) => m.id)]
  );
  const saldos = new Map<number, number | null>(filas.map((f: any) => [Number(f.movimientoId), Number(f.legado) === 1 ? null : Number(f.saldo)]));
  return movimientos.map((m) => Object.assign(m, { saldoPendiente: saldos.get(m.id) ?? null }));
};

const funcionQueryListadoMovimientos = () => {
  const builder = getRepository(Movimiento)
    .createQueryBuilder("movimiento")
    .leftJoinAndSelect("movimiento.sesion", "sesionMovimiento")
    .leftJoinAndSelect("sesionMovimiento.usuario", "usuario")
    .leftJoinAndSelect("movimiento.inventarioActual", "inventarioActual")
    .leftJoinAndSelect("inventarioActual.bodega", "bodega")
    .leftJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoin("producto.archivos", "archivos")
    .addSelect("archivos.id")
    .leftJoinAndSelect("producto.area", "area")
    .leftJoinAndSelect("producto.productoClaves", "productoClaves")
    .leftJoinAndSelect("producto.productoPrecios", "productoPrecios")
    .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
    .leftJoin("movimiento.grupos", "grupo")
    .addSelect(["grupo.id", "grupo.nombre"])
    .leftJoinAndSelect("grupo.comentarios", "gruposComentarios")
    .leftJoinAndSelect("movimiento.operacion", "operacion")
    .leftJoinAndSelect("operacion.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("operacion.proyecto", "proyecto")
    .leftJoinAndSelect("operacion.usuarios", "operacionUsuarios")
    .leftJoinAndSelect("operacion.comentarios", "operacionComentarios")
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
    .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo")
    .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")


  return builder;
  // .addSelect(["proyecto.nombre","proyecto.id"])
};

async function crearNuevoGrupoConMovimientosDeMovimientos(
  nombreNuevoGrupo: string,
  movimientosOrigen: Movimiento[],
  sesionId: number
) {
  const sesion = await getRepository(Sesion).findOneOrFail(sesionId);
  const nuevoGrupo = new Grupo();
  nuevoGrupo.nombre = nombreNuevoGrupo;
  nuevoGrupo.sesion = sesion;
  nuevoGrupo.sesionId = sesionId;
  nuevoGrupo.movimientos = await getRepository(Movimiento).save(
    movimientosOrigen.map((mov) => {
      const nuevoMov = new Movimiento();
      nuevoMov.cantidad = mov.cantidad;
      nuevoMov.inventarioActual = mov.inventarioActual;
      nuevoMov.sesion = sesion;
      nuevoMov.sesionId = sesionId;
      return nuevoMov;
    })
  );
  await getRepository(Grupo).save(nuevoGrupo);
  return {
    id: nuevoGrupo.id,
    nombre: nuevoGrupo.nombre,
    fecha: nuevoGrupo.fecha,
  };
}

async function crearNuevoGrupoConMovimientosDeInventariosActual(
  nombreNuevoGrupo: string,
  inventariosActual: InventarioActual[],
  sesionId: number
) {
  const sesion = await getRepository(Sesion).findOneOrFail(sesionId);
  const nuevoGrupo = new Grupo();
  nuevoGrupo.nombre = nombreNuevoGrupo;
  nuevoGrupo.sesion = sesion;
  nuevoGrupo.sesionId = sesionId;
  nuevoGrupo.movimientos = await getRepository(Movimiento).save(
    inventariosActual.map((inv) => {
      const nuevoMov = new Movimiento();
      nuevoMov.cantidad = inv.cantidad;
      nuevoMov.inventarioActual = inv;
      nuevoMov.sesion = sesion;
      nuevoMov.sesionId = sesionId;
      return nuevoMov;
    })
  );
  await getRepository(Grupo).save(nuevoGrupo);
  return {
    id: nuevoGrupo.id,
    nombre: nuevoGrupo.nombre,
    fecha: nuevoGrupo.fecha,
  };
}

class GrupoController {
  static quitar = async (grupo: Grupo | undefined, sesionId: number) => {
    if (grupo === undefined) throw new AppError("Grupo no definido");
    grupo.sesionId = sesionId;
    const grupoRemovido = await getRepository(Grupo).remove(grupo);

    await GrupoDetalleController.quitar(grupo.grupoDetalle, sesionId);

    return grupoRemovido;
  };

  // ** listaTabla
  static listaTabla = (req: Request, res: Response, next: NextFunction) => {
    CommonController.listaTablaQry(
      req.body,
      funcionQueryListado,
      condicionesWhereAnd
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  static listaTablaPorListado = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // console.log('............................................listaTablaPorListado',req.body);
    const { movimientoTipoId, ...body } = req.body;

    let fnQuery: () => SelectQueryBuilder<any>;

    if (movimientoTipoId !== undefined) {
      // Uno o varios tipos: los listados de bajas piden [13, 16, 5] (justificadas, injustificadas y BAJA* antiguos).
      const tipos = idsSeguros(Array.isArray(movimientoTipoId) ? movimientoTipoId : [movimientoTipoId], "movimientoTipoId");
      fnQuery = () => funcionQueryListado().where("movimientoTipo.id IN (:...tiposListado)", { tiposListado: tipos });
    } else {
      fnQuery = () => funcionQueryListado().where("grupoDetalle.id is NULL");
    }
    CommonController.listaTablaQryAnd(body, fnQuery, condicionesWhereAnd)
      .then((respuesta) => {
        // listado
        // console.log(respuesta.results);
        const { results, filtered, pagination } = respuesta;
        const resultadosAjustados = results.map((resultado) => {
          const { movimientos, ...restoResultado } = resultado;
          const movimientosTotales = resultado.movimientos.length;
          return {
            movimientosTotales,
            ...restoResultado,
          };
        });
        res.json({
          results: resultadosAjustados,
          filtered,
          pagination,
        });
      })
      .catch((error) => next(error));
  };


  static obtenerId = (req: Request, res: Response, next: NextFunction) => {

    const id = parametro(req, "id");

    CommonController.obtenerIdQuery(funcionQueryId(id))
      .then((registro) => {
        res.json(registro);
      })
      .catch((error) => next(error));
  };

  // **
  // PorProyecto
  //
  static listaTablaMovimientosPorProyecto = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el Id de grupo debe venir en los filters....
    const {
      proyectoId,
      movimientoTipoId,
      usuariosIds,
      areasIds,
      bodegasIds,
      ...body
    } = req.body;
    CommonController.listaTablaQryAnd(
      body,
      () => {
        const tiposMovimineto = Array.isArray(movimientoTipoId)
          ? movimientoTipoId
          : [movimientoTipoId];
        const result = funcionQueryListadoMovimientos().where(
          "proyecto.id=:proyectoId and movimientoTipo.id IN (:...tiposMovimineto)",
          { proyectoId: idSeguro(proyectoId, "proyectoId"), tiposMovimineto: idsSeguros(tiposMovimineto, "movimientoTipoId") }
        );
        if (usuariosIds?.length > 0) {
          const ids = idsSeguros(usuariosIds, "usuariosIds");
          result.andWhere(
            new Brackets((qb) =>
              qb.where("operacionUsuarios.id in (:...usuariosIds)", { usuariosIds: ids }).orWhere("usuario.id in (:...usuariosIds)")
            )
          );
        }
        if (areasIds?.length > 0) andWhereIn(result, "area.id", idsSeguros(areasIds, "areasIds"), "areasIds");
        if (bodegasIds?.length > 0) andWhereIn(result, "bodega.id", idsSeguros(bodegasIds, "bodegasIds"), "bodegasIds");
        return result;
      },
      condicionesWhereAnd
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  //** Tabla de Movimientos por Grupo */
  static listaTablaMovimientosPorGrupo = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el Id de grupo debe venir en los filters....
    const { grupoId, ...body } = req.body;
    const { usuarioBodegas, usuarioAreas } = res.locals;
    if (body.filters === undefined) {
      body.filters = {};
    }

    body["filters"]["area.id"] = usuarioAreas;
    body["filters"]["bodega.id"] = usuarioBodegas;

    CommonController.listaTablaQryAnd(
      body,
      () => {
        return funcionQueryListadoMovimientos().where("grupo.id=:grupoId", {
          grupoId,
        });
      },
      condicionesWhereAnd
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** pendientes activos... debería funcionar tambien para rentas externas
  static listaTablaPendientesActivos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      proyectoId,
      usuariosIds,
      areasIds,
      bodegasIds,
      sortField,
      sortOrder,
      pagination,
      filters,
    } = req.body;

    const page = pagination?.current ? pagination.current : 1;
    const pageSize = pagination?.pageSize ?? 10;
    const starts = pageSize * page - pageSize;

    try {
      const campoOrden = columnaSegura(sortField, "movimiento.id");
      const direccion = direccionSegura(sortOrder);

      const qryC = funcionQueryListadoPrestamosPendientes(
        proyectoId,
        usuariosIds,
        areasIds,
        bodegasIds
      );


      // console.log(
      //   "listaTablaPendientesActivos......................................",
      //   qryC.getSql()
      // );
      const conteoTotal = await qryC.getCount();
      const qry = funcionQueryListadoPrestamosPendientes(
        proyectoId,
        usuariosIds,
        areasIds,
        bodegasIds
      );

      const condicionesWhere = condicionesWhereAndPrestamosActivos(filters);
      if (condicionesWhere.sql.length > 0) {
        qry.andWhere(condicionesWhere.sql, condicionesWhere.parametros);
      }
      const filtered = condicionesWhere.sql.length > 0 ? await qry.getCount() : conteoTotal; // sin filtros sería el mismo COUNT
      const qryResult = await conSaldoPendiente(
        await qry.orderBy(campoOrden, direccion).skip(starts).take(pageSize).getMany()
      );

      res.json({
        results: qryResult,
        filtered: conteoTotal,
        pagination: {
          current: page,
          pageSize,
          total: filtered,
          totalItems: conteoTotal,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ** crear lista de movimientos a partir de otro grupo
  static nuevoListadoDeGrupo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el id de grupo debe venir en filters
    const { nombreNuevoGrupo, filters } = req.body;

    const { jwtPayload } = res.locals;

    try {
      const qry = funcionQueryListadoMovimientos();
      aplicarFiltros(qry, condicionesWhereAndPrestamosActivos(filters));
      const qryResult = await qry.getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeMovimientos(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoGeneral = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaCatalogo(body).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoCodigo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaCodigos(body).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoBajas = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaCatalogo({
        ...body,
        estados: [InventarioDisponible.BAJA],
      }).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoProyectos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaProyecto(body).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // TODO nuevoListadoDeCatalogoFacturas
  // **
  static nuevoListadoDeCatalogoFacturas = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    next(new AppError("Funcion no implementada", 501));
  };

  // **

  static nuevoListadoDePendientesActivos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      proyectoId,
      usuariosIds,
      areasIds,
      bodegasIds,
      filters,
      nombreNuevoGrupo,
    } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const qry = funcionQueryListadoPrestamosPendientes(
        proyectoId,
        usuariosIds,
        areasIds,
        bodegasIds
      );

      aplicarFiltros(qry, condicionesWhereAndPrestamosActivos(filters));
      const qryResult = await qry.getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeMovimientos(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  // TODO nuevoListadoDeReporteUso
  static nuevoListadoDeReporteUso = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Sin implementar: antes el manejador estaba vacío y la petición se quedaba colgada (fase 5, rutas.int.test.ts).
    next(new AppError("Funcion no implementada", 501));
  };

  // **
  // TODO nuevoListadoDeReporteMovimiento
  static nuevoListadoDeReporteMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    next(new AppError("Funcion no implementada", 501)); // antes: manejador vacío, petición colgada
  };

  // ** nuevo
  static nuevo = async (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const grupo = new Grupo();
    grupo.sesion = await getRepository(Sesion).findOneOrFail(jwtPayload.si);
    CommonController.nuevo(getRepository(Grupo), grupo, req.body, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** nuevoConTipoMovimiento
  static nuevoConDetalle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { proyectoId, movimientoTipoId, usuariosIds, ...body } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const grupo = new Grupo();
      grupo.grupoDetalle = await GrupoDetalleController.guardar(
        proyectoId,
        movimientoTipoId,
        usuariosIds,
        jwtPayload.si
      );
      grupo.sesion = await getRepository(Sesion).findOneOrFail(jwtPayload.si);
      res.json(
        await CommonController.nuevo(
          getRepository(Grupo),
          grupo,
          body,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // ** nuevoCompra (factura)  -- esto tarda mucho???
  static nuevoConCompra = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      proyectoId,
      movimientoTipoId,
      usuariosIds,
      numero,
      fechaEmision,
      total,
      impuestos,
      montoIngresado,
      proveedorId,
      facturaTipoId,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const grupo = new Grupo();
      grupo.sesion = await getRepository(Sesion).findOneOrFail(jwtPayload.si);
      grupo.grupoDetalle = await GrupoDetalleController.guardarFactura(
        proyectoId,
        movimientoTipoId,
        usuariosIds,
        numero,
        fechaEmision,
        total,
        impuestos,
        montoIngresado,
        proveedorId,
        facturaTipoId,
        jwtPayload.si
      );
      res.json(
        await CommonController.nuevo(
          getRepository(Grupo),
          grupo,
          body,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // ** eliminar  --> solo si no tiene nada
  static borrar = async (req: Request, res: Response, next: NextFunction) => {
    const { grupoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const movimientosGrupo = await getRepository(Movimiento)
        .createQueryBuilder("movimiento")
        .leftJoin("movimiento.grupos", "grupos")
        .where("grupos.id=:grupoId", { grupoId })
        .getCount();

      if (movimientosGrupo > 0) {
        throw new AppError("El grupo NO esta vacio, no se puede eliminar", 401);
      }

      const grupo = await funcionQueryId(grupoId).getOne();
      await GrupoController.quitar(grupo, jwtPayload.si);

      res.json();
    } catch (error) {
      next(error);
    }
  };

  //  **editar
  static editar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    CommonController.editar(getRepository(Grupo), req.body, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** editarConCompra
  static editarConCompra = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      grupoId,
      proyectoId,
      usuariosIds,
      numero,
      fechaEmision,
      total,
      impuestos,
      montoIngresado,
      proveedorId,
      facturaTipoId,
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const grupo = await funcionQueryId(grupoId).getOne();
      if (grupo === undefined) throw new AppError("Grupo ID no encontrado");
      await exigirProyectoEditable({ grupoId }, proyectoId); // antes de modificar nada (plan 02 fase 3)
      const resp = await CommonController.editar(
        getRepository(Grupo),
        { nombre: numero, id: grupoId },
        jwtPayload.si
      );

      await GrupoDetalleController.editarFactura(
        grupo.grupoDetalle,
        proyectoId,
        usuariosIds,
        numero,
        fechaEmision,
        total,
        impuestos,
        montoIngresado,
        proveedorId,
        facturaTipoId,
        jwtPayload.si
      );

      for (const mov of (await obtenerMovimientosConOperacionDeGrupo(grupoId)).filter((m) => m.operacion)) {
        await MovimientoController.editarOperacion(mov, T.COMPRA, proyectoId, usuariosIds, jwtPayload.si);
      }

      res.json();
    } catch (error) {
      next(error);
    }
  };

  // **
  static editarConDetalle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { grupoId, proyectoId, usuariosIds, movimientoTipoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const grupo = await funcionQueryId(grupoId).getOne();
      if (grupo === undefined) throw new AppError("Grupo ID no encontrado");
      await exigirProyectoEditable({ grupoId }, proyectoId); // antes de modificar nada (plan 02 fase 3)

      // Todas las líneas son del tipo del listado (decisión 11). Se valida ANTES de modificar nada: el tipo solo
      // puede cambiar entre BAJA JUSTIFICADA (13) e INJUSTIFICADA (16), o seguir igual.
      const nuevoTipo = Number(movimientoTipoId);
      const movimientos = (await obtenerMovimientosConOperacionDeGrupo(grupoId)).filter((m) => m.operacion); // las líneas sin operación no tienen tipo
      const intercambiables = [T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA];
      for (const mov of movimientos) {
        const actual = Number(mov.operacion.movimientoTipo.id);
        const admitido = tiposAdmitidosEnListado(nuevoTipo).includes(actual) || (intercambiables.includes(actual) && intercambiables.includes(nuevoTipo));
        if (!admitido) {
          throw new AppError("No se puede cambiar el tipo de un listado que ya tiene movimientos (solo entre baja justificada e injustificada)", 400);
        }
      }

      await GrupoDetalleController.editar(
        grupo.grupoDetalle,
        proyectoId,
        movimientoTipoId,
        usuariosIds,
        jwtPayload.si
      );

      for (const mov of movimientos) {
        // Listado antiguo de BAJA* (5): cada línea conserva su tipo (13 o 16); solo cambian proyecto y responsables.
        const tipoLinea = nuevoTipo === T.BAJA_LEGADO ? mov.operacion.movimientoTipo.id : nuevoTipo;
        await MovimientoController.editarOperacion(mov, tipoLinea, proyectoId, usuariosIds, jwtPayload.si);
      }

      res.json();
    } catch (error) {
      next(error);
    }
  };

  // ** habilitar
  static habilitar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const id = parametro(req, "id");
    CommonController.habilitar(getRepository(Grupo), id, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** deshabilitar
  static deshabilitar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const id = parametro(req, "id");
    CommonController.deshabilitar(getRepository(Grupo), id, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** finalizar
  static finalizar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const id = parametro(req, "id");
    CommonController.finalizar(getRepository(Grupo), id, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };
  // ** AGREGAR COMENTARIO
  static agregarComentario = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { jwtPayload } = res.locals;
    const { id, comentario } = req.body;
    CommonController.agregarComentario(
      getRepository(Grupo),
      id,
      jwtPayload.si,
      comentario
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** QUITAR COMENTARIO
  static quitarComentario = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { jwtPayload } = res.locals;
    const { id, idComentario } = req.body;
    CommonController.quitarComentario(
      getRepository(Grupo),
      id,
      jwtPayload.si,
      idComentario
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** agregarArchivo
  static agregarArchivo = async (
    req: any,
    res: Response,
    next: NextFunction
  ) => {
    const { file } = req;
    const { id } = req.body;
    const { jwtPayload } = res.locals;
    try {
      res.json(
        await CommonController.agregarArchivo(
          getRepository(Grupo),
          id,
          jwtPayload.si,
          file
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // ** quitarArchivo
  static quitarArchivo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id, archivoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      await CommonController.quitarArchivo(
        getRepository(Grupo),
        id,
        jwtPayload.si,
        archivoId
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };

  // ** agregarMovimiento
  static agregarMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      codigo,
      cantidad,
      movimientoTipoId,
      proyectoId,
      usuariosIds,
      grupoId,
      relaciones,
      strict,
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const inventarioActual =
        await InventarioActualController.obtenerInventarioActualDeCodigo(
          codigo
        );
      let movimiento: Movimiento;
      if (movimientoTipoId === undefined || movimientoTipoId === null) {
        // Línea de listado sin operación: no afecta al inventario.
        movimiento = await MovimientoController.guardar(
          cantidad,
          inventarioActual,
          jwtPayload.si
        );
        await getRepository(Grupo).findOneOrFail(idSeguro(grupoId, "grupoId"), { select: ["id"], loadEagerRelations: false });
        await getConnection().createQueryBuilder().relation(Grupo, "movimientos").of(grupoId).add(movimiento.id);
      } else if (MovimientoService.esTipoDeEntrada(movimientoTipoId)) {
        throw new AppError(
          "No se pueden realizar operaciones de creacion de artículos en este listado",
          400
        );
      } else {
        // Transaccional: inventario, histórico, operación, movimiento, relaciones y grupo (plan 02 fase 3).
        movimiento = await MovimientoService.registrarOperacion({
          tipo: movimientoTipoId,
          cantidad,
          inventarioActualId: inventarioActual.id,
          proyectoId,
          usuariosIds,
          sesionId: jwtPayload.si,
          grupoId,
          relaciones,
          strict,
        });
      }
      res.json(movimiento);
    } catch (error) {
      next(error);
    }
  };

  // **
  static agregarMovimientoCompra = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      cantidad,
      movimientoTipoId,
      proyectoId,
      usuariosIds,
      precioUnitario,
      precioTotal,
      bodegaId,
      titulo,
      descripcion,
      areaId,
      moneda,
      productoTipoId,
      productoCaracteristicas,
      productoPrecioOriginal,
      productoCodigos,
      grupoId,
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      // Se valida el tipo ANTES de crear nada (antes quedaban productos huérfanos con un tipo inválido).
      if (!MovimientoService.esTipoDeEntrada(movimientoTipoId)) {
        throw new AppError("Tipo de movimiento inválido", 400);
      }
      const codigos = productoCodigos ?? [await autogenerarCodigo()];
      // Producto, inventario y primera operación en UNA transacción (hallazgos C7 y M10).
      const movimiento = await MovimientoService.enTransaccion(async (manager) => {
        // El inventario nace en 0/0: el efecto de la compra/alta suma la cantidad una sola vez (hallazgo H21).
        const inventarioActual = await crearBaseInventarioActual(0, bodegaId, jwtPayload.si);
        inventarioActual.producto = await ProductoController.guardar(
          titulo,
          descripcion,
          areaId,
          productoTipoId,
          productoCaracteristicas,
          productoPrecioOriginal,
          codigos,
          jwtPayload.si,
          moneda,
          manager
        );
        const inventarioActualGuardado = await manager.save(inventarioActual);
        return MovimientoService.registrarOperacion(
          {
            tipo: movimientoTipoId,
            cantidad,
            inventarioActualId: inventarioActualGuardado.id,
            proyectoId,
            usuariosIds,
            sesionId: jwtPayload.si,
            grupoId,
            compra: Number(movimientoTipoId) === T.COMPRA ? { precioUnitario, precioTotal, moneda } : undefined,
          },
          manager
        );
      });
      res.json(movimiento);
    } catch (error) {
      next(error);
    }
  };

  // ** agregarOperacionAMovimiento
  static agregarOperacionAMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { movimientoId, movimientoTipoId, proyectoId, usuariosIds, relaciones, strict } =
      req.body;
    const { jwtPayload } = res.locals;
    try {
      // LA SESION DEL MOVIMIENTO DEBE SER LA DEL ULTIMO QUE LA MODIFICA.
      // El grupo se queda con la sesion de quien lo creó. cada Movimiento
      if (MovimientoService.esTipoDeEntrada(movimientoTipoId)) {
        throw new AppError("No se pueden realizar operaciones de creacion de artículos en este listado", 400);
      }
      const movimiento = await getRepository(Movimiento).findOneOrFail(idSeguro(movimientoId, "movimientoId"), { loadEagerRelations: false, relations: ["inventarioActual"] });
      res.json(
        await MovimientoService.registrarOperacion({
          tipo: movimientoTipoId,
          cantidad: movimiento.cantidad,
          inventarioActualId: movimiento.inventarioActual.id,
          movimientoId: movimiento.id,
          proyectoId,
          usuariosIds,
          sesionId: jwtPayload.si,
          relaciones,
          strict,
        })
      );
    } catch (error) {
      next(error);
    }
  };

  // ** quitarMovimiento
  static quitarMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { movimientoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      // Transaccional; 409 si el movimiento es origen de otros (plan 02 fase 3).
      await MovimientoService.deshacer(movimientoId, jwtPayload.si);
      res.json();
    } catch (error) {
      next(error);
    }
  };

  // Obtener la cantidad de nombres de grupos similares
  static obtenerCanteoNombresSimilares = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { nombre } = req.body;
    try {
      const qry = getRepository(Grupo)
        .createQueryBuilder("grupo")
        .where("grupo.nombre like :nombre", { nombre: `${nombre}%` })
        .getCount();
      const conteo = await qry;
      res.json({conteo});
    } catch (error) {
      next(error);
    }
  }
}

export default GrupoController;
export {
  funcionQueryListadoMovimientos,
  condicionesWhereAnd,
  funcionQueryListadoPrestamosPendientes,
  condicionesWhereAndPrestamosActivos,
};
