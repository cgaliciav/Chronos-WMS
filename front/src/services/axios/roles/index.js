import { PeticionBase } from '..'

/* 
*******************
*******************
ROLES
*******************
*******************
*/

const portionEndPoint = 'role'

export default class ProyectoPeticiones extends PeticionBase {
  static listadoSimple = () => super.listadoSimple(portionEndPoint)

}
