import { PeticionBase } from '..'

const recurso = 'reports'

/** Reportes (`/reports`). */
export default class ReportePeticiones {
  static porGrupo = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'by-group', parametros)
  static porProyecto = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'by-project', parametros)
  static porInventario = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'by-inventory', parametros)
  static deCierre = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'by-project-final', parametros)
}
