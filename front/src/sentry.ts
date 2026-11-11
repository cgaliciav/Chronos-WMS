import * as Sentry from '@sentry/react'
import { version } from '../package.json'
import type { Entorno } from './entorno'

/**
 * Opciones de Sentry, o `null` sin DSN. El entorno y el cliente vienen de `/entorno.json` (en tiempo de ejecución,
 * para que un mismo build sirva a varios despliegues); sin entorno se usa el modo de Vite.
 */
export function opcionesSentry(
  dsn: string | undefined,
  entorno: Entorno,
  modo: string,
  version: string,
): Sentry.BrowserOptions | null {
  if (!dsn) return null
  return {
    dsn,
    environment: entorno.entorno ?? modo,
    release: `chronos-wms-front@${version}`,
    initialScope: { tags: entorno.cliente ? { cliente: entorno.cliente } : {} },
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  }
}

/**
 * Inicializa Sentry solo si hay `VITE_SENTRY_DSN` (plan 01 D16). Los source maps se suben en el build cuando
 * existen `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` (ver `vite.config.ts`).
 */
export function iniciarSentry(entorno: Entorno): boolean {
  const opciones = opcionesSentry(
    import.meta.env.VITE_SENTRY_DSN,
    entorno,
    import.meta.env.MODE,
    version,
  )
  if (!opciones) return false
  Sentry.init(opciones)
  return true
}
