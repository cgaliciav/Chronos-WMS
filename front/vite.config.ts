/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { fileURLToPath } from 'node:url'

/**
 * Sustituye al postprocesador del plugin LESS `AntdThemeLoader` de la plantilla. Los componentes de antd se
 * compilan dentro de `[data-kit-theme='default'] { … }` (src/styles/antd.less) y, en los selectores que antd
 * construye con `&` y prefijos interpolados, Less repite el ámbito en medio del selector:
 * `[ámbito] .ant-layout[ámbito] .ant-layout-has-sider` → `[ámbito] .ant-layout.ant-layout-has-sider`.
 * Se retira en la fase 4 con LESS.
 */
const AMBITO_TEMA = /\[data-kit-theme=['"]?default['"]?\]/
const unificarAmbitoTema = {
  postcssPlugin: 'unificar-ambito-tema',
  Rule(regla: { selector: string; selectors: string[] }) {
    if (!AMBITO_TEMA.test(regla.selector)) return
    regla.selectors = regla.selectors.map(selector => {
      if (!AMBITO_TEMA.test(selector)) return selector
      const ambito = new RegExp(`${AMBITO_TEMA.source} ?`, 'g')
      // Quita el ámbito del principio y une los anidados a su selector anterior; después, un solo ámbito delante.
      const sinAmbito = selector
        .trim()
        .replace(new RegExp(`^${AMBITO_TEMA.source} ?`), '')
        .replace(ambito, '')
      return `[data-kit-theme='default'] ${sinAmbito.trim()}`
    })
  },
}

// Source maps a Sentry solo si el entorno de build trae credenciales (plan 01 D16).
const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env
const pluginSentry =
  SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT
    ? [sentryVitePlugin({ authToken: SENTRY_AUTH_TOKEN, org: SENTRY_ORG, project: SENTRY_PROJECT })]
    : []

const raiz = fileURLToPath(new URL('.', import.meta.url))
const src = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    // Resuelve las importaciones absolutas desde src (components/…, services/…, pages/…) vía baseUrl.
    tsconfigPaths({ loose: true }),
    ...pluginSentry,
  ],
  css: {
    postcss: { plugins: [unificarAmbitoTema] },
    preprocessorOptions: {
      less: { javascriptEnabled: true },
      scss: {
        // 'components/mixins.scss' (desde src) y 'src/components/…' (desde la raíz del front).
        loadPaths: [src, raiz],
        quietDeps: true,
        // Estilos heredados de la plantilla (se eliminan en las fases 4-6 del plan 01).
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div'],
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:4100', changeOrigin: true },
    },
  },
  build: {
    outDir: 'build', // deploy*.sh hacen rsync de build/
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    css: false,
    coverage: { include: ['src/services/**', 'src/stores/**', 'src/helpers/**'] },
  },
})
