import { PeticionBase } from '..'

/* 
*******************
*******************
COMENTARIOS
*******************
*******************
*/

const portionEndPoint = 'comments'

export default class ComentarioPeticiones extends PeticionBase {
  static nuevo = async (parametros = {}) => super.nuevo(portionEndPoint, parametros)

  static quitar = (parametros = {}) => super.generalDelete(portionEndPoint, 'comment', parametros)
}
