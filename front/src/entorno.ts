/** Datos del despliegue que sirve el servidor en `/entorno.json` (Caddy), no el build. */
export interface Entorno {
  cliente?: string
  entorno?: string
}

const TIEMPO_MAXIMO_MS = 2000

/**
 * Lee `/entorno.json`. Nunca lanza: ante 404, error de red, JSON inválido o más de 2 s devuelve `{}`.
 * Va con `cache: 'no-store'` (el service worker no lo precachea porque no es un archivo del build).
 */
export async function cargarEntorno(fetcher: typeof fetch = fetch): Promise<Entorno> {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS)
  try {
    const respuesta = await fetcher('/entorno.json', {
      cache: 'no-store',
      signal: controlador.signal,
    })
    if (!respuesta.ok) return {}
    const datos: unknown = await respuesta.json()
    if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) return {}
    const { cliente, entorno } = datos as Record<string, unknown>
    return {
      ...(typeof cliente === 'string' && cliente ? { cliente } : {}),
      ...(typeof entorno === 'string' && entorno ? { entorno } : {}),
    }
  } catch {
    return {}
  } finally {
    clearTimeout(temporizador)
  }
}
