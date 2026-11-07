import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTOS
*******************
*******************
*/

const portionEndPoint = 'file'

export default class ArchivoPeticiones extends PeticionBase {
  // El componente hace la petición
  // static agregarArchivo = (parametros = {}) =>
  //   super.generalPost(portionEndPoint, 'file', parametros)

  static quitarArchivo = (parametros = {}) =>
    super.generalDelete(portionEndPoint, 'file', parametros)

  static obtenerResponseFileDeId = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'get-response-interface', parametros)
}
