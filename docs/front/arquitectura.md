# Front · Arquitectura actual

Aplicación React (JavaScript heredado + TypeScript para el código nuevo) construida sobre la plantilla comercial
**Clean UI Admin Template (React CRA)** v3.15.17, compilada con Vite desde la fase 2 del plan 01. Consume el API vía `/api/` (proxy inverso) con
JWT en la cabecera `auth`.

## Stack

| Área | Tecnología | Versión |
|---|---|---|
| Build | Vite 8 + `@vitejs/plugin-react` + `vite-tsconfig-paths`; TypeScript 5.9 (`tsc -b`, `allowJs`, `checkJs: false`) | Node 24, npm |
| Calidad | ESLint 10 (flat: typescript-eslint, @eslint-react, react-hooks, prettier), Prettier 3, Vitest 5 (jsdom) | |
| UI | React 16.14, antd 4.24, `@ant-design/icons` 4, Bootstrap 4 CSS | |
| Estado | redux 4, redux-saga 1.1, `connected-react-router` 6, `react-router-dom` 5 (hash history) | |
| HTTP | axios 1.x (`src/services/axios/index.js`) | |
| Fechas | moment 2.24 (fijado con `overrides`) | |
| Estilos | SCSS (Dart Sass) + LESS 4 (tema antd en `styles/antd.less`) + CSS Modules | |
| i18n | react-intl 4.5.4 fijado (solo lo usa la plantilla); locale `es-MX` (único) | |

## Estructura de `front/src`

```
index.jsx           importa estilos (antd base, styles/antd.less, Bootstrap, perfect-scrollbar, global.scss) y ReactDOM.render
redux/store.js      store (redux + saga + router middleware); redux/history.js: hash history
router.jsx          array estático de 67 rutas (React.lazy) + transición CSS; guarda localStorage.ultimaVisitada
localization.jsx    ConfigProvider(antd es_ES) + IntlProvider
styles/antd.less    componentes de antd 4 con el tema claro dentro de [data-kit-theme='default'] (atributo fijo en index.html)
global.scss         estilos de la plantilla (kit-vendors/{antd,bootstrap,nprogress,perfect-scrollbar}, kit-core, cui-styles)
layouts/            index.jsx (elige Public/Auth/Main según ruta y auth), Main (Layout antd + cleanui), Auth, Public
redux/              reducers.js, sagas.js, user/ (login, currentAccount, logout), menu/ (menuData), settings/ (tema y layout de la plantilla)
services/
  axios/index.js    apiClient + PeticionBase (listado, obtenerId, nuevo, editar, enable/disable/closure, generalGet/Post/Put/Delete)
  axios/<recurso>/  20 clases por recurso (grupos, usuarios, inventarioActual, movimientos, …) con `portionEndPoint`
  jwt/              login/currentAccount/logout
  menu/index.js     menú estático con roles por entrada
pages/
  administracion/   usuarios, proyectos, proveedores, areas, bodegas
  catalogos/        1.general … 7.inventarioVisual, articulos (detalle/editar/validado)
  operaciones/      1.prestamos, 2.devoluciones, 3.bajas, 4.compras, 5.altas, 6.rentaExterna, 7.inventario, 8.previo, movimiento, componentes
  reportes/         por-usuario, de-cierre (+ carpetas vacías)
  componentes/      formularios y modales compartidos (precios, claves, características, archivos, comentarios, imágenes)
  auth/             login, 401, 404, 500, 503
components/
  cleanui/          layout (TopBar, Menu/MenuLeft, Breadcrumbs, Footer, Sidebar), system (ACL, Auth/Login, Errors), styles/mixins.scss
  kit/core/         mixins.scss (mixins SCSS de cleanui)
  kit-core, kit-vendors, cui-styles   estilos globales vía global.scss (utilidades kit__utils__*, ajustes antd/Bootstrap)
  mixins.scss       punto de entrada de mixins para los .module.scss de cleanui
helpers/funcionesExtras.js
locales/es-MX.js
```

Tamaño tras la fase 1 del plan 01: 263 archivos / ≈ 21,7 k LOC de JS (antes 961 / ≈ 76 k); el negocio real son ≈ 130 archivos / ≈ 17 k LOC.
Demos, `kit/widgets`, `kit-widgets`, `cui-layout`, `cui-system`, MagicBell e idiomas distintos de `es-MX` se borraron en la fase 1.

## Flujo de autenticación

1. `pages/auth/login` → `cleanui/system/Auth/Login` → saga `user/LOGIN` → `services/jwt.login` →
   `services/axios/autorizacion.login`: obtiene la IP pública en `https://api.ipify.org`, hace
   `POST /auth/login {c, p, ip}` y guarda `t` en `localStorage`.
2. Al cargar la app, saga `LOAD_CURRENT_ACCOUNT` → `GET /user/current` → `user.permisos` (códigos de rol).
3. Interceptor de request: `headers.auth = localStorage.t`. Interceptor de respuesta: si llega
   cabecera `t`, la guarda (renovación). Interceptor de error: muestra `notification.error` y
   **devuelve** el error (no lo rechaza; ver hallazgos).
4. `components/cleanui/system/ACL` (`roles`, `redirect`, `defaultRedirect`) envuelve cada página y
   bloque sensible: oculta `children` si `user.permisos` no intersecta `roles`; con `redirect` navega a `/auth/401`.
5. El menú (`services/menu`) filtra entradas por `role`; `ADMINISTRADOR` ve todo.

## Convenciones del código de negocio

- Páginas = `index.jsx` por ruta + carpeta `componentes/` con formularios (`forma*.jsx`), tablas
  (`tabla*.jsx`) y columnas (`columnas*.jsx`). Código nuevo en `.ts/.tsx`.
- Tablas server-side con antd `Table` y el contrato `list-antd` del API
  (`{ results, pagination: { current, pageSize, total, totalItems }, filtered }`); filtros y orden se
  envían como `{ sortField, sortOrder, pagination, filters }`.
- Formularios con `Form.useForm` (antd 4); fechas con `moment`; códigos de barras leídos con
  escáner en `operaciones/componentes/formaAC.jsx`.
- Importaciones absolutas desde `src` (`tsconfig.json` `baseUrl` + `vite-tsconfig-paths`): `components/…`,
  `services/…`, `pages/…`, `redux/…`. Variables de entorno con `import.meta.env.VITE_*`.
- Sin pruebas automatizadas todavía (Vitest configurado; primeras pruebas en la fase 3). ESLint 10 + Prettier 3
  (sin punto y coma, comillas simples, 100 col).

### Estilos y cascada (transitorio hasta la fase 4)

Orden de carga: `antd/lib/style/index.less` → `styles/antd.less` → Bootstrap → perfect-scrollbar → `global.scss`.
Los componentes de antd se compilan dentro de `[data-kit-theme='default']` para que su especificidad supere a los
ajustes de `kit-vendors/antd/css`, como en el build de CRA. El plugin PostCSS `unificarAmbitoTema`
(`vite.config.ts`) reemplaza al antiguo `AntdThemeLoader`: une el ámbito que Less repite en selectores con `&`.

## Despliegue

`deploy-production.sh`: `npm version patch` (package.json + lock), commit y tag git, `npm ci && npm run build`, `rsync` de
`build/` al servidor y `tar.gz` en `deploy_history/`. `deploy.sh` (pruebas) solo hace rsync de `build/`.
