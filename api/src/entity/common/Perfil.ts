/**
 * Perfil del usuario (decisión 22): de él salen todos sus permisos (`services/perfiles.ts`).
 * `personalizado` es solo para usuarios anteriores a los perfiles: conservan sus roles sueltos (`usuario_roles_rol`).
 * `sin-acceso` es un usuario sin correo (decisión 23): existe para figurar como responsable, no entra ni recibe correos.
 */
export enum Perfil {
  SUPERADMINISTRADOR = "superadministrador",
  ADMINISTRADOR = "administrador",
  ENCARGADO_PRODUCCION = "encargado-produccion",
  VISITA = "visita",
  SIN_ACCESO = "sin-acceso",
  PERSONALIZADO = "personalizado",
}
