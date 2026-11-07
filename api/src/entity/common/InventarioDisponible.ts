/** Disponibilidad de un `InventarioActual`. Vive aparte de la entidad para que las reglas puras no carguen TypeORM. */
export enum InventarioDisponible {
  DISPONIBLE = "disponible",
  NO_DISPONIBLE = "no-disponible",
  BAJA = "baja",
  CUARENTENA = "cuarentena",
}
