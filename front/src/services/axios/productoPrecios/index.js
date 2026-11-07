import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTO PRECIO
*******************
*******************
*/
// listado de perfiles para un select (combobox)
const portionEndPoint = 'item-price'

export default class ProductoPrecioPeticiones extends PeticionBase {
  // editar
  static editar = (parametros = {}) => super.editar(portionEndPoint, parametros)
}
