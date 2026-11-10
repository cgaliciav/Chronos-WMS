# Changelog · Front

Cambios notables del front de Chronos-WMS. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y la numeración, [versionado semántico](https://semver.org/lang/es/): **mayor** para cambios que rompen el
despliegue, el contrato con el API o el uso de la aplicación; **menor** para funciones nuevas; **parche** para
correcciones.

La versión vive en `package.json` (la usa Sentry como `release`, `chronos-wms-front@<versión>`).
`deploy-production.sh` sube el **parche** en cada despliegue a producción (`npm version patch`) y crea el tag
`v<versión>`; los saltos de mayor o menor se hacen a mano con `npm version <x.y.z> --no-git-tag-version` y se anotan aquí.
Los códigos `F<n>` remiten a [`docs/hallazgos-codigo.md`](../docs/hallazgos-codigo.md) y los `D<n>` a las decisiones del
[plan 01](../docs/planes/01-front-actualizacion-antd.md).

## [Sin publicar]

Pendiente: fase 7 del plan 01 (pruebas e2e con Playwright, CI y cobertura).

## [4.0.0] - 2026-11-09

Reescritura técnica completa del front (plan 01, fases 0-6). Las pantallas, rutas y permisos son los mismos,
pero cambian la plataforma de compilación, las dependencias y el despliegue; por eso sube la versión mayor.

### Cambios que rompen

- **Node 24 y npm** obligatorios (`.nvmrc`, `engines` con `engine-strict`); se elimina `yarn.lock` (D2, D3).
- **Vite 8** en lugar de Create React App: `npm run dev` / `build` / `preview`; salida en `build/` con source maps;
  `index.html` en la raíz (D1).
- Variables de entorno **`VITE_*`** en lugar de `REACT_APP_*`: `VITE_API_URL` (por defecto `/api/`),
  `VITE_SENTRY_DSN`, `VITE_NOTIFICACIONES` (ver `.env.example`).
- Requiere el **API de la fase 2 del plan 02 o posterior**: el login ya no envía `ip` (la toma el API, D15), las URLs de
  imágenes y archivos llevan `?auth=<token>` (`conToken`), los listados de bajas se crean como tipo 13 o 16 (el API
  rechaza el 5) y regenerar contraseña ya no recibe la clave (`{ correo, enviado }`).
- Se retira **MagicBell** (D14); la campana propia solo aparece con `VITE_NOTIFICACIONES=on`, cuando el API exponga
  `/notifications`.

### Añadido

- TypeScript 5.9 estricto en todo `src` (`allowJs: false`), con los tipos del API en `types/api.ts` (D13).
- Estado global con **Zustand 5** (`usuario.store`, `ui.store`) en lugar de redux + redux-saga (D6).
- Armazón propio en antd puro (`src/app`): layouts, menú filtrado por permisos con migas, `ACL`, login, páginas
  de error 401/404/500/503 y `ErrorBoundary`.
- Listados de bajas **justificadas (13) o injustificadas (16)**: el tipo se elige al crear el listado y lo heredan sus
  líneas (decisión 11).
- Sentry preparado: solo se inicializa si existe `VITE_SENTRY_DSN` (D16).
- Pruebas con Vitest + Testing Library + MSW (50 pruebas); ESLint 10 (flat config) y Prettier 3.
- Documentación: inventario de rutas, checklist de humo y capturas de referencia en `docs/front/`.

### Cambiado

- React 16.13 → **19.3**; antd 4.2 → **6.7** e `@ant-design/icons` 6 (tema en tokens, `src/tema.ts`);
  `react-router-dom` 5 → **`react-router` 8** con `createHashRouter` y rutas *lazy* (se mantiene el *hash routing*).
- moment → **dayjs** (locale `es-mx`, `helpers/fechas.ts`) (D8).
- `<Helmet>` → `<Titulo>` sobre el `<title>` nativo de React 19 (D12); interfaz solo en `es-MX`, sin `react-intl` (D11).
- API de antd sin componentes ni props obsoletos: 0 avisos en la consola de desarrollo en las 67 rutas (F12).
- Llamadas al API solo vía `services/axios` (`PeticionBase` genérica); el token y `localStorage` solo vía
  `helpers/storage` (F11).
- `deploy-production.sh` y `deploy.sh` pasan a npm (F19).

### Eliminado

- La plantilla **Clean UI** completa (`components/cleanui`, `kit*`, `cui-*`, páginas demo): `src` pasa de 961 a ≈ 260
  archivos.
- Bootstrap, reactstrap, Sass, LESS, las fuentes de iconos y más de 40 dependencias sin uso (gráficas, editor,
  mapas, lodash, prop-types, `clear-cache`…).
- Tema oscuro y su selector (D10).
- Páginas huérfanas sin ruta: inventario físico por grupos (`operaciones/7.inventario/nuevo`, decisión 10) y
  `reportes/5.inventario` (F29), junto con los métodos de servicio de endpoints retirados del API.

### Corregido

- El interceptor de axios devolvía el error en vez de rechazarlo: las páginas trataban fallos como éxitos (F1).
- El login dependía de `api.ipify.org` (F2); "finalizar listado" llamaba a la ruta equivocada (F3); los permisos
  seguían en memoria tras cerrar sesión (F4); la query string modificaba ajustes (F5).
- Préstamos, devoluciones, bajas, compras y rentas enviaban `usuariosIds`/`proveedorId` indefinidos (F37); no se podían
  agregar artículos a compras con responsables (F38); un usuario nuevo nunca guardaba proyectos (F39).
- Escribir en la búsqueda de los `Select` lanzaba `TypeError` (F40); búsquedas de catálogos y rentas con filtros
  cruzados o mal paginadas (F41).
- Páginas de detalle y edición que se rompían con respuestas incompletas o `?uid` inválido (F22, F36); imagen
  "sin foto" rota (F27).
- Filtro de estatus fijo en el listado de usuarios (F35), fugas de listeners en el menú (F7), claves aleatorias en
  listas (F8), spinners y formularios que se reactivaban o vaciaban antes de tiempo (F30-F32).

## [3.15.17] - 2025-03-06

Última versión publicada desde el repositorio original `almacen-front-v3-r1` (commit `bad60e8`), sobre Create React
App, React 16 y la plantilla Clean UI. Su historial no se conserva en este monorepo (ver el `README.md` raíz).
