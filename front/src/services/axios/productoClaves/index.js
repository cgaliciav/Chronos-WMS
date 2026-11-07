import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTO CLAVE
*******************
*******************
*/
// listado de perfiles para un select (combobox)
const portionEndPoint = 'item-code'

export default class ProductoClavePeticiones extends PeticionBase {
  // crear nuevo
  static nuevo = async (parametros = {}) => super.nuevo(portionEndPoint, parametros)

  // crear nuevo autogenerada
  // new-self-generated
  static nuevoAutogenerado = async (parametros = {}) =>
    super.generalPost(portionEndPoint, 'new-self-generated', parametros)

  static borrar = async (parametros = {}) =>
    super.generalDelete(portionEndPoint, 'remove', parametros)
}
