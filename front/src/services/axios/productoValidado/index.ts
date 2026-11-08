import { PeticionBase } from '..'

const recurso = 'item-review'

/** Validación de producto (`/item-review`). */
export default class ProductoValidadoPeticiones {
  static validar = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'approve', parametros)
  static invalidar = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'refuse', parametros)
  static noRevisado = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'no-review', parametros)
}
