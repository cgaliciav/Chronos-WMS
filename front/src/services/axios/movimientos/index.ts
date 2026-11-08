import { PeticionBase } from '..'
import type { Grupo, Movimiento } from 'types/api'

const recurso = 'activity'

/** Movimientos (`/activity`). */
export default class MovimientoPeticiones {
  static obtenerUltimoMovimiento = (id: number | string) =>
    PeticionBase.generalGet<Movimiento>(recurso, 'prior-activity', id)
  static obtenerGrupo = (id: number | string) => PeticionBase.generalGet<Grupo>(recurso, 'get-group', id)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<Movimiento>(recurso, id)
  static obtenerHistorial = (id: number | string) =>
    PeticionBase.generalGet<Movimiento[]>(recurso, 'history-by-current-inventory', id)
}
