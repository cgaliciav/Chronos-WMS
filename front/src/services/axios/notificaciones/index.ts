import { PeticionBase } from '..'
import type { Notificacion } from 'types/api'

const recurso = 'notifications'

/** Notificaciones propias (`/notifications`, plan 02 fase 7). */
export default class NotificacionPeticiones {
  static listado = () => PeticionBase.generalGetNoParam<Notificacion[]>(recurso, '')
  static marcarLeida = (id: number) => PeticionBase.generalPut(recurso, `${id}/read`)
}
