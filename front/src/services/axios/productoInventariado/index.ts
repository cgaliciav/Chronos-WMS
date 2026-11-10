import { PeticionBase } from '..'

const recurso = 'item-balance'

/** Resultado de inventario por producto (`/item-balance`). */
export default class ProductoInventariadoPeticiones {
  static inventarioExiste = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'in-balance', parametros)
  static inventarioNoExiste = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'out-balance', parametros)
  static noRevisado = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'no-review', parametros)
  /** Registros de inventario del producto (`GET /item-balance/:id` devuelve una lista). */
  static obtenerId = <T = unknown[]>(id: number | string) => PeticionBase.obtenerId<T>(recurso, id)
}
