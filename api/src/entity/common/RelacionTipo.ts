/** Tipo de una fila de `movimiento_relacion`. Aparte de la entidad para que las reglas puras no carguen TypeORM. */
export enum RelacionTipo {
  DEVOLUCION = "devolucion",
  BAJA = "baja",
  TRANSFERENCIA = "transferencia",
  CIERRE_INVENTARIO = "cierre-inventario",
}
