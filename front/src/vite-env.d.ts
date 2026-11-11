/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Ruta del API (por defecto `/api/`), relativa al dominio que sirve el front. */
  readonly VITE_API_URL?: string
  /** DSN de Sentry; sin valor, Sentry no se inicializa (plan 01 D16, fase 3). */
  readonly VITE_SENTRY_DSN?: string
  /** `off` oculta la campana de notificaciones hasta que exista el sistema propio (plan 01 D14). */
  readonly VITE_NOTIFICACIONES?: 'on' | 'off'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
