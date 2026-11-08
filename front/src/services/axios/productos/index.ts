import { PeticionBase } from '..'

const recurso = 'item'

/** Productos (`/item`). */
export default class ProductoPeticiones {
  static agregarComentario = (parametros: object = {}) =>
    PeticionBase.generalPut(recurso, 'comment', parametros)
  static quitarComentario = (parametros: object = {}) =>
    PeticionBase.generalDelete(recurso, 'comment', parametros)
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
}
