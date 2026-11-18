/** Tipo de una fila de `movimiento_relacion`. Aparte de la entidad para que las reglas puras no carguen TypeORM. */
export enum RelacionTipo {
  DEVOLUCION = "devolucion",
  BAJA = "baja",
  TRANSFERENCIA = "transferencia",
  CIERRE_INVENTARIO = "cierre-inventario",
  /** Origen = TRANSFORMACIÓN (18) del artículo original; derivado = ALTA POR TRANSFORMACIÓN (19) de un producto nuevo. Une inventarios distintos. */
  TRANSFORMACION = "transformacion",
}
