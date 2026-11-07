import { PeticionBase } from '..'

/* 
*******************
*******************
MOVIMIENTOS
*******************
*******************
*/
// listado de perfiles para un select (combobox)
const portionEndPoint = 'activity'

export default class MovimientoPeticiones extends PeticionBase {
  static obtenerUltimoMovimiento = id => super.generalGet(portionEndPoint, 'prior-activity', id)

  static obtenerGrupo = id => super.generalGet(portionEndPoint, 'get-group', id)

  static obtenerId = id => super.obtenerId(portionEndPoint,id)

  static obtenerHistorial = id => super.generalGet(portionEndPoint,'history-by-current-inventory',id)
}
