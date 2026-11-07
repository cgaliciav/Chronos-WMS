import { PeticionBase } from '..'

/* 
*******************
*******************
FACTURA TIPOS
*******************
*******************
*/

const portionEndPoint = 'invoice-kind'

export default class FacturaTipoPeticiones extends PeticionBase {

  static listadoSimple = ()=> super.listadoSimple(portionEndPoint)

}