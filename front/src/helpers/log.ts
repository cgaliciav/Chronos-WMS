/**
 * Registro de depuración (plan 01 fase 6, paso 7): sustituye a los `console.*` del código de negocio.
 * `log.debug`/`log.info` solo escriben en desarrollo; `log.error` siempre (y en producción va a Sentry si está
 * activo, vía el ErrorBoundary o capturas explícitas).
 */
const desarrollo = import.meta.env.DEV

export const log = {
  debug: (...datos: unknown[]) => {
    if (desarrollo) console.debug(...datos)
  },
  info: (...datos: unknown[]) => {
    if (desarrollo) console.info(...datos)
  },
  warn: (...datos: unknown[]) => {
    if (desarrollo) console.warn(...datos)
  },
  error: (...datos: unknown[]) => {
    console.error(...datos)
  },
}
