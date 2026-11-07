import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTO CARACTERÍSTICA
*******************
*******************
*/
// listado de perfiles para un select (combobox)
const portionEndPoint = 'item-spec'

export default class ProductoCaracteristicaPeticiones extends PeticionBase {
  // editar
  static editar = (parametros = {}) => super.editar(portionEndPoint, parametros)

  // crear nuevo
  static nuevo = async (parametros = {}) => super.nuevo(portionEndPoint, parametros)

  static borrar = async (parametros = {}) =>
    super.generalDelete(portionEndPoint, 'remove', parametros)
}
