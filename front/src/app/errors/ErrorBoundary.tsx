import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import ErrorPage from './ErrorPage'

interface Estado {
  hayError: boolean
}

/**
 * Límite de errores del contenido de las páginas (sustituye a `layouts/Main/manejandoErrores`). Muestra la página
 * 503 y avisa a Sentry si está activo. Se reinicia al cambiar de ruta (el layout le pasa `key={pathname}`).
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { hayError: false }

  static getDerivedStateFromError(): Estado {
    return { hayError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
    if (import.meta.env.DEV) console.error(error, info)
  }

  render() {
    return this.state.hayError ? <ErrorPage code={503} /> : this.props.children
  }
}
