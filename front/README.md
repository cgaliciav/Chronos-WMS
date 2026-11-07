# Almacén · Front

SPA React + Ant Design del sistema de almacén. Construida originalmente sobre la plantilla
[Clean UI Admin Template](https://docs.cleanuitemplate.com); el plan
[`../docs/planes/01-front-actualizacion-antd.md`](../docs/planes/01-front-actualizacion-antd.md)
describe la migración a Vite + React 19 + antd 6 y la eliminación de la plantilla.

Documentación: [`../docs/front/arquitectura.md`](../docs/front/arquitectura.md), guía para agentes en
[`CLAUDE.md`](CLAUDE.md), fallos conocidos en [`../docs/hallazgos-codigo.md`](../docs/hallazgos-codigo.md).

### Stack actual
- Node 14 (`.nvmrc`; el build legado está verificado con 14.21.3), Yarn v1.22
- React 16.13, antd 4.2, redux + redux-saga, react-router-dom 5 (hash), Create React App 3.4 + react-app-rewired

### Variables de entorno
Ver `.env.example`: `REACT_APP_API_URL` (por defecto `/api/`).

### Inicio rápido
```bash
nvm use
yarn install
yarn start      # desarrollo
yarn build      # producción (carpeta build/, la despliegan deploy*.sh)
```
