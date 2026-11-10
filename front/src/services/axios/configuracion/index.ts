import { apiClient, PeticionBase } from '..'
import type { Marca } from 'app/marca'

const recurso = 'config'

export interface Regional {
  monedaPorDefecto: string
  monedas: string[]
  locale: string
  zonaHoraria: string
}

/** `GET /config/public`: lo que muestra la pantalla de login (sin token). */
export interface ConfigPublica {
  marca: Omit<Marca, 'logoId' | 'faviconId'>
  regional: Regional
  /** Rutas del API (`/config/public/logo?v=3`) o `null` si el cliente no subió imagen. */
  logoUrl: string | null
  faviconUrl: string | null
  version: string
}

export type SeccionConfig = 'marca' | 'correo' | 'reportes' | 'regional'
export interface SeccionConValor<T = Record<string, unknown>> {
  valor: T
  version: number
}

/** Configuración por cliente (`/config`, plan 03). */
export default class ConfiguracionPeticiones {
  static publica = async (): Promise<ConfigPublica> => {
    const { data } = await apiClient.get<ConfigPublica>(`/${recurso}/public`)
    return data
  }
  static todas = () =>
    PeticionBase.generalGetNoParam<Record<SeccionConfig, SeccionConValor>>(recurso, '')
  static guardar = (seccion: SeccionConfig, version: number, valor: unknown) =>
    PeticionBase.generalPut<SeccionConValor>(recurso, seccion, { version, valor })
  /** Sube logo o favicon de la marca, o el logo de los reportes (multipart `file`). */
  static subirImagen = async (
    destino: 'marca/logo' | 'marca/favicon' | 'reportes/logo',
    archivo: File,
  ) => {
    const formulario = new FormData()
    formulario.append('file', archivo)
    const { data } = await apiClient.post<SeccionConValor>(`/${recurso}/${destino}`, formulario)
    return data
  }
  static probarCorreo = () =>
    PeticionBase.generalPost<{ enviado: boolean; transporte: string; destino: string }>(
      recurso,
      'correo/prueba',
    )
}
