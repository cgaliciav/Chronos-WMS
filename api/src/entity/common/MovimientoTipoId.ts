/**
 * Ids fijos de `movimiento_tipo` (iguales en producción y en la semilla de pruebas).
 * Semántica de cada tipo: docs/api/tipos-de-movimiento.md. Usa estas constantes en lugar de números.
 */
export enum MovimientoTipoId {
  COMPRA_LEGADO = 1,
  ALTA_LEGADO = 2,
  PRESTAMO = 3,
  DEVOLUCION = 4,
  BAJA_LEGADO = 5,
  AJUSTE_INVENTARIO = 6,
  TRANSFERENCIA_ORIGEN = 7,
  BAJA_EN_INVENTARIO = 8,
  INVENTARIO = 9,
  AJUSTE_ADMINISTRADOR = 10,
  RENTA_EXTERNA = 11,
  TRANSFERENCIA_DESTINO = 12,
  BAJA_JUSTIFICADA = 13,
  ALTA = 14,
  COMPRA = 15,
  BAJA_INJUSTIFICADA = 16,
  BAJA_ADMINISTRADOR = 17,
}

const T = MovimientoTipoId;

/** Crean saldo en el almacén (aumentan `cantidadAlmacen`); nunca son derivados. */
export const TIPOS_ENTRADA: number[] = [T.COMPRA_LEGADO, T.ALTA_LEGADO, T.ALTA, T.COMPRA];
/** Salen del almacén hacia un proyecto (disminuyen `cantidad`). */
export const TIPOS_SALIDA: number[] = [T.PRESTAMO, T.RENTA_EXTERNA, T.TRANSFERENCIA_DESTINO];
/**
 * Abren un saldo pendiente de regreso contra el que se relacionan las devoluciones y bajas del mismo proyecto.
 * Incluye la COMPRA (15): el artículo comprado nace "en el proyecto" (`cantidad = 0`, no disponible) hasta su
 * primera devolución al almacén; la heurística heredada ya la contaba como salida.
 */
export const TIPOS_ORIGEN: number[] = [...TIPOS_SALIDA, T.COMPRA];
/** Consumen saldo de un origen del mismo inventario y proyecto. */
export const TIPOS_REGRESO: number[] = [T.DEVOLUCION, T.TRANSFERENCIA_ORIGEN, T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA, T.BAJA_LEGADO];
/** Bajas que cierran el inventario completo sin proyecto. */
export const TIPOS_BAJA_LIBRE: number[] = [T.BAJA_EN_INVENTARIO, T.BAJA_ADMINISTRADOR];
/**
 * No son movimientos de almacén (decisión 12): un inventario o un ajuste no mueve artículos. El API ya no registra
 * operaciones ni crea listados con estos tipos; solo existen en datos antiguos (y se pueden deshacer).
 */
export const TIPOS_NO_MOVIMIENTO: number[] = [T.AJUSTE_INVENTARIO, T.INVENTARIO, T.AJUSTE_ADMINISTRADOR];
/** Tipos con los que ya no se crean listados: BAJA* (5, sustituido por 13 y 16; decisión 11) y los que no son movimientos. */
export const TIPOS_LISTADO_NO_PERMITIDOS: number[] = [T.BAJA_LEGADO, ...TIPOS_NO_MOVIMIENTO];

/**
 * Tipos de movimiento que admite un listado (decisión 11): todas sus líneas son del tipo del listado. Los listados
 * antiguos de BAJA* (5) contienen bajas justificadas e injustificadas, así que admiten 13 y 16.
 */
export const tiposAdmitidosEnListado = (tipoListado: number): number[] =>
  Number(tipoListado) === T.BAJA_LEGADO ? [T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA] : [Number(tipoListado)];
/** Tipos cuyo saldo pendiente se calcula (vista `v_movimiento_saldo`): orígenes + transferencia origen (para su 12). */
export const TIPOS_CON_SALDO: number[] = [...TIPOS_ORIGEN, T.TRANSFERENCIA_ORIGEN];

export const esTipo = (lista: number[], tipo: number | string | undefined | null) =>
  tipo !== undefined && tipo !== null && lista.includes(Number(tipo));
