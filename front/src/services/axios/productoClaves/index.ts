import { PeticionBase } from '..'

const recurso = 'item-code'

/** Claves / códigos de barras de producto (`/item-code`). */
export default class ProductoClavePeticiones {
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
  static nuevoAutogenerado = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'new-self-generated', parametros)
  static borrar = (parametros: object = {}) => PeticionBase.generalDelete(recurso, 'remove', parametros)
}
