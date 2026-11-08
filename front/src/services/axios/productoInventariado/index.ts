import { PeticionBase } from '..'
import type { NombreEstatus } from 'types/api'

const recurso = 'item-balance'

/** Resultado de inventario por producto (`/item-balance`). */
export default class ProductoInventariadoPeticiones {
  static inventarioExiste = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'in-balance', parametros)
  static inventarioNoExiste = (parametros: object = {}) =>
    PeticionBase.generalPost(recurso, 'out-balance', parametros)
  static noRevisado = (parametros: object = {}) => PeticionBase.generalPost(recurso, 'no-review', parametros)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<NombreEstatus>(recurso, id)
}
