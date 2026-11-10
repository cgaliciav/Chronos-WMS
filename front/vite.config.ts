/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Source maps a Sentry solo si el entorno de build trae credenciales (plan 01 D16).
const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env
const pluginSentry =
  SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT
    ? [sentryVitePlugin({ authToken: SENTRY_AUTH_TOKEN, org: SENTRY_ORG, project: SENTRY_PROJECT })]
    : []

export default defineConfig({
  plugins: [
    react(),
    // Resuelve las importaciones absolutas desde src (components/…, services/…, pages/…) vía baseUrl.
    tsconfigPaths({ loose: true }),
    ...pluginSentry,
  ],
  server: {
    port: 3000,
    proxy: {
      // Igual que el nginx de producción (`proxy_pass …/;`): el API monta sus rutas en `/`, sin el prefijo `/api`.
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
      },
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
