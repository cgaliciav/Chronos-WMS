import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { notification } from 'helpers/feedback'
import { guardarToken, obtenerToken } from 'helpers/storage'
import type { NombreEstatus, ParametrosTabla, RespuestaMensaje, ResultadoTabla } from 'types/api'

/** URL base del API: dominio actual + `VITE_API_URL` (por defecto `/api/`). */
function configuracionApi() {
  const { protocol, hostname, port } = window.location
  const dominio =
    port && port !== '80' && port !== '443'
      ? `${protocol}//${hostname}:${port}`
      : `${protocol}//${hostname}`
  const ruta = import.meta.env.VITE_API_URL || '/api/'
  const rutaNormalizada = ruta.startsWith('/') ? ruta : `/${ruta}`
  return { dominio, ruta: rutaNormalizada, url: `${dominio}${rutaNormalizada}` }
}

export const apiURLBase = configuracionApi().url

if (import.meta.env.DEV) console.log(import.meta.env.MODE, apiURLBase)

export const apiClient = axios.create({
  baseURL: apiURLBase,
  timeout: 25000,
})

apiClient.interceptors.request.use(peticion => {
  const token = obtenerToken()
  if (token) peticion.headers.set('auth', token)
  return peticion
})

interface CuerpoError {
  message?: string
}

apiClient.interceptors.response.use(
  respuesta => {
    // El API renueva el token en la cabecera `t`.
    const tokenNuevo = respuesta.headers.t as string | undefined
    if (tokenNuevo) guardarToken(tokenNuevo)
    return respuesta
  },
  (error: AxiosError<CuerpoError>) => {
    if (import.meta.env.DEV) console.log('error ApiClient', { error })
    notification.error({ title: error.response?.data?.message ?? error.message })
    // Antes devolvía el error y la promesa se resolvía con él (hallazgo F1): ahora se rechaza y quien llama
    // decide con try/catch (la notificación ya se mostró aquí).
    return Promise.reject(error)
  },
)

/**
 * Añade el token como `?auth=` a una URL del API que el navegador carga directamente (imágenes, miniaturas,
 * descargas): los `GET /file/*` exigen token (plan 02, fase 2).
 */
export function conToken<T extends string | undefined>(url: T): T {
  const token = obtenerToken()
  if (!url || !token) return url
  const separador = url.includes('?') ? '&' : '?'
  return `${url}${separador}auth=${encodeURIComponent(token)}` as T
}

/** Elemento de los endpoints `list-names`. */
export type ElementoListado = Pick<NombreEstatus, 'id' | 'nombre'> & Record<string, unknown>

async function pedir<T>(configuracion: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.request<T>(configuracion)
  return data
}

function registrar(etiqueta: string, parametros: unknown) {
  if (import.meta.env.DEV) console.log(`---PARAMETROS ${etiqueta}`, parametros)
}

/**
 * Operaciones genéricas sobre `/<recurso>/…`. Cada servicio (`services/axios/<recurso>`) las fija a su recurso.
 * Todas rechazan la promesa si el API responde con error.
 */
export class PeticionBase {
  static listadoSimple = <T = ElementoListado>(recurso: string) =>
    pedir<T[]>({ method: 'get', url: `/${recurso}/list-names` })

  static listado = <T>(recurso: string, parametros: ParametrosTabla = {}) => {
    registrar('listado', parametros)
    return pedir<ResultadoTabla<T>>({
      method: 'post',
      url: `/${recurso}/list-antd`,
      data: { ...parametros },
    })
  }

  static obtenerId = <T>(recurso: string, id: number | string) =>
    pedir<T>({ method: 'get', url: `/${recurso}/${id}` })

  static editar = <T = RespuestaMensaje>(recurso: string, parametros: object = {}) => {
    registrar('editar', parametros)
    return pedir<T>({ method: 'put', url: `/${recurso}/edit`, data: { ...parametros } })
  }

  static nuevo = <T = RespuestaMensaje>(recurso: string, parametros: object = {}) => {
    registrar('nuevo', parametros)
    return pedir<T>({ method: 'post', url: `/${recurso}/new`, data: { ...parametros } })
  }

  static habilitar = <T = RespuestaMensaje>(recurso: string, id: number | string) =>
    pedir<T>({ method: 'put', url: `/${recurso}/enable/${id}` })

  static inhabilitar = <T = RespuestaMensaje>(recurso: string, id: number | string) =>
    pedir<T>({ method: 'put', url: `/${recurso}/disable/${id}` })

  static finalizar = <T = RespuestaMensaje>(recurso: string, id: number | string) =>
    pedir<T>({ method: 'put', url: `/${recurso}/closure/${id}` })

  static generalPut = <T = RespuestaMensaje>(
    recurso: string,
    ruta: string,
    parametros: object = {},
  ) => {
    registrar('PUT', parametros)
    return pedir<T>({ method: 'put', url: `/${recurso}/${ruta}`, data: { ...parametros } })
  }

  static generalPost = <T = RespuestaMensaje>(
    recurso: string,
    ruta: string,
    parametros: object = {},
  ) => {
    registrar('POST', parametros)
    return pedir<T>({ method: 'post', url: `/${recurso}/${ruta}`, data: { ...parametros } })
  }

  static generalPostBlob = (recurso: string, ruta: string, parametros: object = {}) => {
    registrar('POST blob', parametros)
    return pedir<Blob>({
      method: 'post',
      url: `/${recurso}/${ruta}`,
      data: { ...parametros },
      responseType: 'blob',
    })
  }

  static generalGet = <T>(recurso: string, ruta: string, parametro: number | string) =>
    pedir<T>({ method: 'get', url: `/${recurso}/${ruta}/${parametro}` })

  static generalGetNoParam = <T>(recurso: string, ruta: string) =>
    pedir<T>({ method: 'get', url: `/${recurso}/${ruta}` })

  static generalDelete = <T = RespuestaMensaje>(
    recurso: string,
    ruta: string,
    parametros: object = {},
  ) => pedir<T>({ method: 'delete', url: `/${recurso}/${ruta}`, data: { ...parametros } })
}

export { AxiosError }
