const CLAVE = 'recargaPorChunkPerdido'
/** Margen para no recargar en bucle si el chunk sigue sin existir tras recargar. */
const MARGEN_MS = 10_000

/**
 * Respaldo del service worker: si falla la carga de un chunk (`vite:preloadError`, p. ej. una pestaña sin service
 * worker con una versión que el despliegue ya borró), recarga la página una vez para tomar la versión nueva.
 */
export function iniciarRecargaPorChunkPerdido(): void {
  window.addEventListener('vite:preloadError', evento => {
    try {
      const ultima = Number(sessionStorage.getItem(CLAVE) ?? 0)
      if (Date.now() - ultima < MARGEN_MS) return // ya se recargó hace poco: se deja ver el error
      sessionStorage.setItem(CLAVE, String(Date.now()))
    } catch {
      return // sin sessionStorage no se puede evitar el bucle
    }
    evento.preventDefault()
    window.location.reload()
  })
}
