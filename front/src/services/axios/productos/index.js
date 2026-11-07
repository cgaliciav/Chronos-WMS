import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTOS
*******************
*******************
*/

const portionEndPoint = 'item'

export default class ProductoPeticiones extends PeticionBase {
  static agregarComentario = (parametros = {}) =>
    super.generalPut(portionEndPoint, 'comment', parametros)

  static quitarComentario = (parametros = {}) =>
    super.generalDelete(portionEndPoint, 'comment', parametros)

  static editar = (parametros = {}) => super.editar(portionEndPoint, parametros)

  //   static nuevo = async (parametros = {}) => super.nuevo(portionEndPoint, parametros)
}
