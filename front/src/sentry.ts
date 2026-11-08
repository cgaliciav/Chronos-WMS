import * as Sentry from '@sentry/react'
import { version } from '../package.json'

/**
 * Inicializa Sentry solo si hay `VITE_SENTRY_DSN` (plan 01 D16). Los source maps se suben en el build cuando
 * existen `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` (ver `vite.config.ts`).
 */
export function iniciarSentry(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return false
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `chronos-wms-front@${version}`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
  return true
}
