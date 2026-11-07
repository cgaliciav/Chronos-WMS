import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTO VALIDACION
*******************
*******************
*/
// listado de perfiles para un select (combobox)
const portionEndPoint = 'item-review'

export default class ProductoValidado extends PeticionBase {
  // editar
  static validar = (parametros = {}) => super.generalPost(portionEndPoint, 'approve', parametros)

  static invalidar = (parametros = {}) => super.generalPost(portionEndPoint, 'refuse', parametros)

  static noRevisado = (parametros = {}) => super.generalPost(portionEndPoint, 'no-review', parametros)

}
