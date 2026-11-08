import { PeticionBase } from '..'

const recurso = 'item-spec'

/** Características de producto (`/item-spec`). */
export default class ProductoCaracteristicaPeticiones {
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
  static borrar = (parametros: object = {}) => PeticionBase.generalDelete(recurso, 'remove', parametros)
}
