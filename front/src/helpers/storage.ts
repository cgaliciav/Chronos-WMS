/**
 * Acceso a localStorage (sustituye a la librería `store`). El token de sesión se guarda en crudo bajo `t`,
 * como hasta ahora, para no invalidar las sesiones abiertas; el resto de valores se serializan en JSON.
 */
const CLAVE_TOKEN = 't'

function disponible(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function obtenerToken(): string | null {
  return disponible() ? localStorage.getItem(CLAVE_TOKEN) : null
}

export function guardarToken(token: string): void {
  if (disponible()) localStorage.setItem(CLAVE_TOKEN, token)
}

export function borrarToken(): void {
  if (disponible()) localStorage.removeItem(CLAVE_TOKEN)
}

export function leerJSON<T>(clave: string, porDefecto: T): T {
  if (!disponible()) return porDefecto
  const valor = localStorage.getItem(clave)
  if (valor === null) return porDefecto
  try {
    return JSON.parse(valor) as T
  } catch {
    return porDefecto
  }
}

export function guardarJSON(clave: string, valor: unknown): void {
  if (disponible()) localStorage.setItem(clave, JSON.stringify(valor))
}

export function borrar(clave: string): void {
  if (disponible()) localStorage.removeItem(clave)
}
