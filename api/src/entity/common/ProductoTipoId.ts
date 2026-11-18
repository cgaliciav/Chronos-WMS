/**
 * Ids fijos de `producto_tipo` (iguales en producción y en la semilla de pruebas).
 * CONSUMIBLE es el "expendable" de la decisión 18: al prestarlo se da por consumido y no deja pendiente de devolución.
 */
export enum ProductoTipoId {
  REGULAR = 1,
  CONSUMIBLE = 2,
}
