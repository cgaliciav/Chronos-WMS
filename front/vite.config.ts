/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { fileURLToPath } from 'node:url'

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
    preprocessorOptions: {
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
