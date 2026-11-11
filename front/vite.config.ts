/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

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
    // PWA: el service worker precachea solo el front (nunca /api) para detectar versiones nuevas y avisar
    // (`app/actualizacion`); la pestaña abierta sigue funcionando aunque el despliegue borre los chunks viejos.
    // Solo existe en el build. Para retirarlo de todos los navegadores: `selfDestroying: true` y desplegar.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Chronos WMS',
        short_name: 'Chronos WMS',
        start_url: '/',
        display: 'standalone',
        theme_color: '#4b7cf3',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      // Igual que el nginx de producción (`proxy_pass …/;`): el API monta sus rutas en `/`, sin el prefijo `/api`.
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
        rewrite: ruta => ruta.replace(/^\/api/, ''),
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
