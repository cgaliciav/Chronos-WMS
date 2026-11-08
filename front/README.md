# Almacén · Front

SPA React + Ant Design del sistema de almacén. Construida originalmente sobre la plantilla
[Clean UI Admin Template](https://docs.cleanuitemplate.com); el plan
[`../docs/planes/01-front-actualizacion-antd.md`](../docs/planes/01-front-actualizacion-antd.md)
describe la migración a Vite + React 19 + antd 6 y la eliminación de la plantilla.

Documentación: [`../docs/front/arquitectura.md`](../docs/front/arquitectura.md), guía para agentes en
[`CLAUDE.md`](CLAUDE.md), fallos conocidos en [`../docs/hallazgos-codigo.md`](../docs/hallazgos-codigo.md).

### Stack actual
- Node 24 (`.nvmrc`, `engines` con `engine-strict`), npm
- Vite 8 + TypeScript 5.9 (`allowJs`: el código heredado sigue en `.js/.jsx` y se convierte por fases)
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
