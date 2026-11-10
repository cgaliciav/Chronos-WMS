import { apiURLBase, conToken, PeticionBase } from '..'
import type { Notificacion } from 'types/api'

const recurso = 'notifications'

/** Notificaciones propias (`/notifications`, plan 02 fase 7). */
export default class NotificacionPeticiones {
  static listado = () => PeticionBase.generalGetNoParam<Notificacion[]>(recurso, '')
  static marcarLeida = (id: number) => PeticionBase.generalPut(recurso, `${id}/read`)
  static marcarTodas = () => PeticionBase.generalPut<{ actualizadas: number }>(recurso, 'read-all')
  /** URL de Server-Sent Events. `EventSource` no envía cabeceras: el token va en `?auth=`. */
  static urlStream = () => conToken(`${apiURLBase}${recurso}/stream`)
}

/** Las URL del API (`/file/...`) se abren con el token; el resto son rutas del front. */
export const esRecursoDelApi = (url: string) => url.startsWith('/file/')
export const urlRecursoDelApi = (url: string) => conToken(`${apiURLBase}${url.replace(/^\//, '')}`)
