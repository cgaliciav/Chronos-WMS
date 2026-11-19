import { PeticionBase } from '..'

const recurso = 'reports'

/** Reportes (`/reports`). */
export default class ReportePeticiones {
  static porGrupo = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'by-group', parametros)
  static porProyecto = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'by-project', parametros)
  /** Excel de los artículos comprados a un proveedor; `proyectoId` es opcional. */
  static porProveedor = (parametros: object = {}) =>
    PeticionBase.generalPost<{ message: string }>(recurso, 'by-supplier', parametros)
  static porInventario = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'by-inventory', parametros)
  static deCierre = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'by-project-final', parametros)
}
