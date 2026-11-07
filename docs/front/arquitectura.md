# Front · Arquitectura actual

Aplicación React (JavaScript, sin TypeScript) construida sobre la plantilla comercial
**Clean UI Admin Template (React CRA)** v3.15.17. Consume el API vía `/api/` (proxy inverso) con
JWT en la cabecera `auth`.

## Stack

| Área | Tecnología | Versión |
|---|---|---|
| Build | Create React App 3.4.1 + `react-app-rewired` + `customize-cra` (`config-overrides.js`: decorators legacy, less-loader, eslintrc, webpackbar) | Node 10.24.1, Yarn 1.22 |
| UI | React 16.13, antd 4.2, `@ant-design/icons` 4, Bootstrap 4 CSS, `reactstrap` (solo demo) | |
| Estado | redux 4, redux-saga 1.1, `connected-react-router` 6, `react-router-dom` 5 (hash history) | |
| HTTP | axios 1.x (`src/services/axios/index.js`) | |
| Fechas | moment 2.24 (fijado en `resolutions`) | |
| Estilos | SCSS (node-sass 4) + LESS (temas antd) + CSS Modules | |
| i18n | react-intl (solo lo usa la plantilla); locale `es-MX` | |

## Estructura de `front/src`

```
index.js            crea hash history, store (redux + saga + router middleware), ReactDOM.render
router.js           array estático de 64 rutas (React.lazy) + transición CSS; guarda localStorage.ultimaVisitada
localization.js     ConfigProvider(antd es_ES) + IntlProvider
global.scss         importa bootstrap, estilos de la plantilla (kit-vendors, kit-core, cui-styles)
layouts/            index.js (elige Public/Auth/Main según ruta y auth), Main (Layout antd + cleanui), Auth, Public
redux/              reducers.js, sagas.js, user/ (login, currentAccount, logout), menu/ (menuData), settings/ (tema y layout de la plantilla)
services/
  axios/index.js    apiClient + PeticionBase (listado, obtenerId, nuevo, editar, enable/disable/closure, generalGet/Post/Put/Delete)
  axios/<recurso>/  20 clases por recurso (grupos, usuarios, inventarioActual, movimientos, …) con `portionEndPoint`
  jwt/              login/currentAccount/logout
  menu/index.js     menú estático con roles por entrada
pages/
  administracion/   usuarios, proyectos, proveedores, areas, bodegas, parametros
  catalogos/        1.general … 7.inventarioVisual, articulos (detalle/editar/validado)
  operaciones/      1.prestamos, 2.devoluciones, 3.bajas, 4.compras, 5.altas, 6.rentaExterna, 7.inventario, 8.previo, movimiento, componentes
  reportes/         por-usuario, de-cierre (+ carpetas vacías)
  componentes/      formularios y modales compartidos (precios, claves, características, archivos, comentarios, imágenes)
  auth/             login, 401, 404, 500, 503 (+ no enrutadas)
  <demo>/           advanced, apps, cards, charts, dashboard, ecommerce, icons, tables, ui-kits, widgets  ← plantilla, no se usa
components/
  cleanui/          layout (TopBar, Menu, Breadcrumbs, Footer, Sidebar), system (ACL, Auth/Login, Errors), styles  ← EN USO
  cui-layout, cui-styles, cui-system   ← copia alternativa de la plantilla, NO se usa
  kit, kit-core, kit-vendors, kit-widgets ← widgets/demos de la plantilla, solo los usa /dashboard/alpha
helpers/funcionesExtras.js
locales/            es-MX (en uso), en-US, fr-FR, ru-RU, zh-CN
```

Tamaño: 961 archivos / ≈ 76 k LOC; el negocio real son ≈ 130 archivos / ≈ 17 k LOC.

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

- Páginas = `index.js` por ruta + carpeta `componentes/` con formularios (`forma*.js`), tablas
  (`tabla*.js`) y columnas (`columnas*.js`).
- Tablas server-side con antd `Table` y el contrato `list-antd` del API
  (`{ results, pagination: { current, pageSize, total, totalItems }, filtered }`); filtros y orden se
  envían como `{ sortField, sortOrder, pagination, filters }`.
- Formularios con `Form.useForm` (antd 4); fechas con `moment`; códigos de barras leídos con
  escáner en `operaciones/componentes/formaAC.js`.
- Importaciones absolutas desde `src` (`jsconfig.json` `baseUrl`): `components/…`, `services/…`,
  `pages/…`, `redux/…`, `index` (para `history`/`store`, importación circular).
- Sin pruebas automatizadas. ESLint airbnb + prettier (sin punto y coma, comillas simples, 100 col).

## Despliegue

`deploy-production.sh`: bump de versión con `jq`, tag git, `yarn build` (4 GB heap), `rsync` de
`build/` al servidor y `tar.gz` en `deploy_history/`. `deploy.sh` (pruebas) solo hace rsync de `build/`.
