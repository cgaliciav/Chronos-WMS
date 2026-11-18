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
  /** Unidades de un artículo que la producción transformó en otros productos (decisión 20). Solo vía `activity-transform`. */
  TRANSFORMACION = 18,
  /** Producto nuevo creado por una transformación; queda a cargo de la producción, como una compra. */
  ALTA_POR_TRANSFORMACION = 19,
}

const T = MovimientoTipoId;

/** Crean saldo en el almacén (aumentan `cantidadAlmacen`); nunca son derivados. */
export const TIPOS_ENTRADA: number[] = [T.COMPRA_LEGADO, T.ALTA_LEGADO, T.ALTA, T.COMPRA, T.ALTA_POR_TRANSFORMACION];
/**
 * Entradas que hacen a un producto "de la producción" (decisión 21): quien tiene el modo de visibilidad `produccion` ve
 * siempre lo que compró o creó por transformación alguno de sus proyectos, aunque después se preste a otro.
 */
export const TIPOS_ENTRADA_DE_PRODUCCION: number[] = [T.COMPRA_LEGADO, T.COMPRA, T.ALTA_POR_TRANSFORMACION];
/** Tipos de una transformación (decisión 20): solo se registran juntos desde PUT /groups/activity-transform y no se deshacen. */
export const TIPOS_TRANSFORMACION: number[] = [T.TRANSFORMACION, T.ALTA_POR_TRANSFORMACION];
/** Salen del almacén hacia un proyecto (disminuyen `cantidad`). */
export const TIPOS_SALIDA: number[] = [T.PRESTAMO, T.RENTA_EXTERNA, T.TRANSFERENCIA_DESTINO];
/**
 * Abren un saldo pendiente de regreso contra el que se relacionan las devoluciones y bajas del mismo proyecto.
 * Incluye la COMPRA (15): el artículo comprado nace "en el proyecto" (`cantidad = 0`, no disponible) hasta su
 * primera devolución al almacén; la heurística heredada ya la contaba como salida.
 */
export const TIPOS_ORIGEN: number[] = [...TIPOS_SALIDA, T.COMPRA, T.ALTA_POR_TRANSFORMACION];
/** Consumen saldo de un origen del mismo inventario y proyecto. */
export const TIPOS_REGRESO: number[] = [T.DEVOLUCION, T.TRANSFERENCIA_ORIGEN, T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA, T.BAJA_LEGADO, T.TRANSFORMACION];
/** Bajas sin proyecto: descuentan primero del almacén y, por el excedente, cierran salidas abiertas (decisión 19). */
export const TIPOS_BAJA_LIBRE: number[] = [T.BAJA_EN_INVENTARIO, T.BAJA_ADMINISTRADOR];
/** Bajas con proyecto: descuentan primero de lo que está fuera del almacén. */
export const TIPOS_BAJA_PROYECTO: number[] = [T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA, T.BAJA_LEGADO, T.TRANSFORMACION];
/** Todas las bajas: descuentan `cantidad` unidades de `cantidadAlmacen` (decisión 19). */
export const TIPOS_BAJA: number[] = [...TIPOS_BAJA_PROYECTO, ...TIPOS_BAJA_LIBRE];
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
export const tiposAdmitidosEnListado = (tipoListado: number): number[] => {
  if (Number(tipoListado) === T.BAJA_LEGADO) return [T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA];
  // Un listado de transformaciones contiene la línea del original (18) y las de los productos nuevos (19).
  if (Number(tipoListado) === T.TRANSFORMACION) return [...TIPOS_TRANSFORMACION];
  return [Number(tipoListado)];
};
/** Tipos cuyo saldo pendiente se calcula (vista `v_movimiento_saldo`): orígenes + transferencia origen (para su 12). */
export const TIPOS_CON_SALDO: number[] = [...TIPOS_ORIGEN, T.TRANSFERENCIA_ORIGEN];

export const esTipo = (lista: number[], tipo: number | string | undefined | null) =>
  tipo !== undefined && tipo !== null && lista.includes(Number(tipo));
