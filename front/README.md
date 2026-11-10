# Almacén · Front

SPA React + Ant Design del sistema de almacén, en TypeScript. Se construyó sobre la plantilla Clean UI, ya
retirada; el plan [`../docs/planes/01-front-actualizacion-antd.md`](../docs/planes/01-front-actualizacion-antd.md)
describe la migración a Vite + React 19 + antd 6.

Documentación: [`../docs/front/arquitectura.md`](../docs/front/arquitectura.md), guía para agentes en
[`CLAUDE.md`](CLAUDE.md), fallos conocidos en [`../docs/hallazgos-codigo.md`](../docs/hallazgos-codigo.md).
Versión actual: **4.0.0**; historial de cambios en [`CHANGELOG.md`](CHANGELOG.md).

### Stack actual
- Node 24 (`.nvmrc`, `engines` con `engine-strict`), npm
- Vite 8 + TypeScript 5.9 strict (todo el código en `.ts/.tsx`)
- React 19.3, antd 6.7 (tokens en `src/tema.ts`), dayjs, Zustand 5, react-router 8 (hash), Sentry opcional
- Pruebas: Vitest + Testing Library + MSW

### Variables de entorno
Ver `.env.example`: `VITE_API_URL` (por defecto `/api/`), `VITE_SENTRY_DSN`, `VITE_NOTIFICACIONES`.

### Inicio rápido
```bash
nvm use
npm ci
npm run dev        # desarrollo en http://localhost:3000 (proxy /api → http://localhost:4100)
npm run build      # typecheck + producción en build/ (la despliegan deploy*.sh)
npm run preview    # sirve build/
npm run lint       # ESLint 10 (flat config)
npm run typecheck  # tsc -b
npm test           # Vitest
```
