import { PeticionBase } from '..'

const recurso = 'item-price'

/** Precios de producto (`/item-price`). */
export default class ProductoPrecioPeticiones {
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
}
