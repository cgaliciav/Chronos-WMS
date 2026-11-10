/**
 * Decide a qué movimientos ORIGEN se aplica un movimiento DERIVADO y por cuánto (plan 02 §2.1, reglas 1-6 y 8).
 * Función PURA: recibe las salidas abiertas del inventario (ya leídas bajo bloqueo) y devuelve las filas de
 * `movimiento_relacion` a crear, o lanza AppError. El acceso a datos vive en `MovimientoService.resolverRelaciones`.
 */
import { RelacionTipo } from "../../entity/common/RelacionTipo";
import {
  esTipo,
  MovimientoTipoId as T,
  TIPOS_BAJA_LIBRE,
  TIPOS_ORIGEN,
  TIPOS_REGRESO,
} from "../../entity/common/MovimientoTipoId";
import { AppError } from "../../helpers/errorClases";

/** Movimiento con saldo pendiente (fila de `v_movimiento_saldo`, sin legados). */
export interface OrigenAbierto {
  movimientoId: number;
  movimientoTipoId: number;
  proyectoId: number | null;
  proyectoNombre?: string | null;
  fecha: Date;
  cantidad: number;
  saldo: number;
}

export interface RelacionSolicitada {
  origenId: number;
  cantidad: number;
}

export interface EntradaPlan {
  tipo: number;
  cantidad: number;
  proyectoId: number | null;
  proyectoNombre?: string | null;
  /** Salidas abiertas (saldo > 0) del MISMO inventario, de cualquier proyecto y tipo con saldo. */
  abiertos: OrigenAbierto[];
  /** Saldo heredado del proyecto según la heurística anterior (movimientos legados); ≥ 0. */
  pendienteLegado: number;
  relaciones?: RelacionSolicitada[] | null;
  strict?: boolean;
}

export interface RelacionPlaneada {
  origenId: number;
  cantidad: number;
  tipo: RelacionTipo;
}

export interface Plan {
  relaciones: RelacionPlaneada[];
  /** Parte del derivado cubierta por saldo legado (modo de compatibilidad, regla 8). Se registra con nivel warn. */
  cubiertoPorLegado: number;
  /** 12 sin 7 abierto: se registra como salida sin origen (compatibilidad con el front actual). */
  sinOrigen: boolean;
}

const redondear = (n: number) => Math.round(n * 10000) / 10000;
const MENSAJE_SIN_SALDO = "NO SE PUEDE REALIZAR LA OPERACION, EL PRODUCTO YA ESTA DEVUELTO O NO ES DE ESTE PROYECTO";

const tipoRelacion = (tipo: number): RelacionTipo => {
  switch (tipo) {
    case T.DEVOLUCION:
      return RelacionTipo.DEVOLUCION;
    case T.TRANSFERENCIA_ORIGEN:
    case T.TRANSFERENCIA_DESTINO:
      return RelacionTipo.TRANSFERENCIA;
    case T.BAJA_EN_INVENTARIO:
    case T.BAJA_ADMINISTRADOR:
      return RelacionTipo.CIERRE_INVENTARIO;
    default:
      return RelacionTipo.BAJA;
  }
};

/** Orden FIFO: el origen más antiguo primero (a igual fecha, el de menor id). */
const fifo = (a: OrigenAbierto, b: OrigenAbierto) =>
  new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.movimientoId - b.movimientoId;

const candidatas = (origenes: OrigenAbierto[]) =>
  origenes.map((o) => ({ movimientoId: o.movimientoId, movimientoTipoId: o.movimientoTipoId, proyectoId: o.proyectoId, fecha: o.fecha, cantidad: o.cantidad, saldo: o.saldo }));

/** Valida relaciones enviadas por el cliente contra los orígenes elegibles. */
const validarExplicitas = (e: EntradaPlan, elegibles: OrigenAbierto[], relTipo: RelacionTipo): RelacionPlaneada[] => {
  const vistos = new Set<number>();
  let suma = 0;
  const filas = (e.relaciones ?? []).map((r) => {
    const origenId = Number(r.origenId);
    const cantidad = Number(r.cantidad);
    if (vistos.has(origenId)) throw new AppError(`El origen ${origenId} está repetido en las relaciones`, 400);
    vistos.add(origenId);
    if (!(cantidad > 0)) throw new AppError("La cantidad de cada relación debe ser mayor de 0", 400);
    const origen = elegibles.find((o) => o.movimientoId === origenId);
    if (origen === undefined) {
      const otro = e.abiertos.find((o) => o.movimientoId === origenId);
      if (otro !== undefined && esTipo(TIPOS_ORIGEN, otro.movimientoTipoId) && otro.proyectoId !== e.proyectoId) {
        throw new AppError(`El movimiento ${origenId} no pertenece al proyecto seleccionado ${e.proyectoNombre ?? e.proyectoId ?? ""}`, 400);
      }
      throw new AppError(`El movimiento ${origenId} no es una salida con saldo pendiente de este artículo`, 400);
    }
    if (cantidad > origen.saldo) {
      throw new AppError(`La relación con el movimiento ${origenId} (${cantidad}) excede su saldo pendiente (${origen.saldo})`, 400);
    }
    suma = redondear(suma + cantidad);
    return { origenId, cantidad, tipo: relTipo };
  });
  if (suma !== redondear(e.cantidad)) {
    throw new AppError(`La suma de las relaciones (${suma}) debe ser igual a la cantidad del movimiento (${e.cantidad})`, 400);
  }
  return filas;
};

/** Reparte `cantidad` entre los elegibles por orden FIFO. Devuelve las filas y lo que no se pudo cubrir. */
const repartirFifo = (cantidad: number, elegibles: OrigenAbierto[], relTipo: RelacionTipo) => {
  let restante = redondear(cantidad);
  const relaciones: RelacionPlaneada[] = [];
  for (const origen of [...elegibles].sort(fifo)) {
    if (restante <= 0) break;
    const aplicado = Math.min(restante, origen.saldo);
    relaciones.push({ origenId: origen.movimientoId, cantidad: redondear(aplicado), tipo: relTipo });
    restante = redondear(restante - aplicado);
  }
  return { relaciones, restante };
};

const exigirEleccion = (e: EntradaPlan, elegibles: OrigenAbierto[]) => {
  if (e.strict && elegibles.length > 1) {
    throw new AppError("Hay varias salidas abiertas para este artículo: indique a cuál corresponde el movimiento", 409, {
      candidatas: candidatas([...elegibles].sort(fifo)),
    });
  }
};

const planRegreso = (e: EntradaPlan): Plan => {
  const relTipo = tipoRelacion(e.tipo);
  const elegibles = e.abiertos.filter((o) => esTipo(TIPOS_ORIGEN, o.movimientoTipoId) && o.proyectoId === e.proyectoId);
  if (e.relaciones?.length) {
    return { relaciones: validarExplicitas(e, elegibles, relTipo), cubiertoPorLegado: 0, sinOrigen: false };
  }
  const pendienteLegado = Math.max(0, redondear(e.pendienteLegado));
  if (elegibles.length === 0 && pendienteLegado <= 0) {
    const deOtroProyecto = e.abiertos.find((o) => esTipo(TIPOS_ORIGEN, o.movimientoTipoId) && o.proyectoId !== e.proyectoId);
    if (deOtroProyecto !== undefined) {
      throw new AppError(
        `El movimiento no pertenece al proyecto seleccionado ${e.proyectoNombre ?? e.proyectoId ?? ""}, es del proyecto: ${deOtroProyecto.proyectoNombre ?? deOtroProyecto.proyectoId}`,
        400
      );
    }
    throw new AppError(MENSAJE_SIN_SALDO, 400);
  }
  exigirEleccion(e, elegibles);
  const { relaciones, restante } = repartirFifo(e.cantidad, elegibles, relTipo);
  if (restante > pendienteLegado) {
    const saldo = redondear(elegibles.reduce((s, o) => s + o.saldo, 0) + pendienteLegado);
    throw new AppError(`LA CANTIDAD (${e.cantidad}) EXCEDE EL SALDO PENDIENTE DEL PROYECTO (${saldo})`, 400);
  }
  return { relaciones, cubiertoPorLegado: restante, sinOrigen: false };
};

const planTransferenciaDestino = (e: EntradaPlan): Plan => {
  const relTipo = RelacionTipo.TRANSFERENCIA;
  const elegibles = e.abiertos.filter((o) => o.movimientoTipoId === T.TRANSFERENCIA_ORIGEN);
  if (e.relaciones?.length) {
    return { relaciones: validarExplicitas({ ...e, proyectoId: null }, elegibles, relTipo), cubiertoPorLegado: 0, sinOrigen: false };
  }
  if (elegibles.length === 0) {
    return { relaciones: [], cubiertoPorLegado: 0, sinOrigen: true };
  }
  exigirEleccion(e, elegibles);
  const { relaciones, restante } = repartirFifo(e.cantidad, elegibles, relTipo);
  if (restante > 0) {
    const saldo = redondear(elegibles.reduce((s, o) => s + o.saldo, 0));
    throw new AppError(`LA CANTIDAD (${e.cantidad}) EXCEDE LO PENDIENTE DE TRANSFERIR (${saldo})`, 400);
  }
  return { relaciones, cubiertoPorLegado: 0, sinOrigen: false };
};

/** Bajas sin proyecto: cierran todas las salidas abiertas del inventario por su saldo completo (trazabilidad). */
const planBajaLibre = (e: EntradaPlan): Plan => {
  if (e.relaciones?.length) throw new AppError("Las bajas sin proyecto no admiten relaciones explícitas", 400);
  const relaciones = [...e.abiertos]
    .filter((o) => esTipo(TIPOS_ORIGEN, o.movimientoTipoId))
    .sort(fifo)
    .map((o) => ({ origenId: o.movimientoId, cantidad: o.saldo, tipo: RelacionTipo.CIERRE_INVENTARIO }));
  return { relaciones, cubiertoPorLegado: 0, sinOrigen: false };
};

export const planificarRelaciones = (e: EntradaPlan): Plan => {
  const tipo = Number(e.tipo);
  const entrada = { ...e, tipo, cantidad: Number(e.cantidad) };
  if (esTipo(TIPOS_REGRESO, tipo)) return planRegreso(entrada);
  if (tipo === T.TRANSFERENCIA_DESTINO) return planTransferenciaDestino(entrada);
  if (esTipo(TIPOS_BAJA_LIBRE, tipo)) return planBajaLibre(entrada);
  if (e.relaciones?.length) throw new AppError("Este tipo de movimiento no admite relaciones con otros movimientos", 400);
  return { relaciones: [], cubiertoPorLegado: 0, sinOrigen: false };
};
