import { PeticionBase } from '..'

/* 
*******************
*******************
REPORTES
*******************
*******************
*/

const portionEndPoint = 'reports'

export default class ReportePeticiones extends PeticionBase {
  static porGrupo = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'by-group', parametros)

  static porProyecto = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'by-project', parametros)

  static porInventario = (parametros = {}) => super.generalPost(portionEndPoint,'by-inventory',parametros)

  static deCierre = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'by-project-final', parametros)


  // static quitarComentario = (parametros = {}) =>
  //   super.generalDelete(portionEndPoint, 'comment', parametros)

  // static editar = (parametros = {}) => super.editar(portionEndPoint, parametros)

  //   static nuevo = async (parametros = {}) => super.nuevo(portionEndPoint, parametros)
}
