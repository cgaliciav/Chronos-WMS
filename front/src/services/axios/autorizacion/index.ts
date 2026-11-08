import { apiClient } from '..'
import { guardarToken } from 'helpers/storage'
import type { RespuestaLogin, VersionApi } from 'types/api'

/** Autenticación (`/auth`). */
export default class AutorizacionPeticiones {
  /**
   * `POST /auth/login` con `{ c, p }` y guarda el token. Ya no consulta `api.ipify.org` ni envía `ip`: el API
   * toma la IP de la conexión (plan 01 D15, plan 02 fase 2; hallazgo F2).
   */
  static login = async (correo: string, contrasena: string): Promise<RespuestaLogin> => {
    const { data } = await apiClient.post<RespuestaLogin>('/auth/login', { c: correo, p: contrasena })
    guardarToken(data.t)
    return data
  }

  static logout = () => apiClient.post('/auth/logout')

  static version = async (): Promise<VersionApi> => {
    const { data } = await apiClient.get<VersionApi>('/auth/version')
    return data
  }
}
