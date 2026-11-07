import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTO INVENTARIADO
*******************
*******************
*/
// listado de perfiles para un select (combobox)
const portionEndPoint = 'item-balance'

export default class ProductoValidado extends PeticionBase {
  // editar
  static inventarioExiste = (parametros = {}) => super.generalPost(portionEndPoint, 'in-balance', parametros)

  static inventarioNoExiste = (parametros = {}) => super.generalPost(portionEndPoint, 'out-balance', parametros)

  static noRevisado = (parametros = {}) => super.generalPost(portionEndPoint, 'no-review', parametros)

  static obtenerId = id => super.obtenerId(portionEndPoint, id)

}
