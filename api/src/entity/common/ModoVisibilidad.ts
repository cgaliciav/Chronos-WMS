/**
 * Modo de visibilidad de un usuario (plan 04 bloque B, decisión 21).
 *  - GENERAL: ve y opera todos los productos.
 *  - PRODUCCION ("producción exclusiva"): solo los productos comprados o creados por transformación por alguno de sus
 *    proyectos asignados, o cuyo último movimiento es de uno de ellos.
 *  - USUARIO ("usuario exclusivo"): solo los productos en cuyos movimientos aparece como responsable o como quien registró.
 */
export enum ModoVisibilidad {
  GENERAL = "general",
  PRODUCCION = "produccion",
  USUARIO = "usuario",
}
