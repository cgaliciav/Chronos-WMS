import { PeticionBase } from '..'

const recurso = 'comments'

/** Comentarios (`/comments`). */
export default class ComentarioPeticiones {
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
  static quitar = (parametros: object = {}) => PeticionBase.generalDelete(recurso, 'comment', parametros)
}
