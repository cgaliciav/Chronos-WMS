# Front · Arquitectura actual

Aplicación React (JavaScript heredado + TypeScript para el código nuevo) construida sobre la plantilla comercial
**Clean UI Admin Template (React CRA)** v3.15.17, compilada con Vite desde la fase 2 del plan 01. Consume el API vía `/api/` (proxy inverso) con
JWT en la cabecera `auth`.

## Stack

| Área | Tecnología | Versión |
|---|---|---|
| Build | Vite 8 + `@vitejs/plugin-react` + `vite-tsconfig-paths`; TypeScript 5.9 (`tsc -b`, `allowJs`, `checkJs: false`) | Node 24, npm |
| Calidad | ESLint 10 (flat: typescript-eslint, @eslint-react, react-hooks, prettier), Prettier 3, Vitest 5 (jsdom) + Testing Library 16 + MSW 3 | |
| UI | React 19.3, antd 6.7, `@ant-design/icons` 6, Bootstrap 4 CSS | |
| Estado y rutas | Zustand 5 (`stores/`), `react-router` 8 (`createHashRouter`) | |
| Observabilidad | `@sentry/react` 11 (solo con `VITE_SENTRY_DSN`) + `@sentry/vite-plugin` (source maps si hay credenciales) | |
| HTTP | axios 1.21 (`src/services/axios/index.ts`) | |
| Fechas | dayjs 1.11 (`helpers/fechas.ts`: plugins y locale `es-mx`) | |
| Estilos | antd 6 CSS-in-JS con tokens y variables CSS (`tema.ts`) + SCSS heredado de la plantilla (Dart Sass) + CSS Modules | |
| i18n | Ninguna librería: textos en español; antd con `locale` `es_ES` | |

## Estructura de `front/src`

```
index.tsx           estilos (antd reset, Bootstrap, perfect-scrollbar, global.scss, layout-plantilla), fechas, Sentry,
                    detección de viewport, recuperación de sesión y createRoot(<ConfigProvider tema><App><RouterProvider/>)
router.tsx          createHashRouter: layout raíz + 67 rutas lazy + "/" según permisos + "*" → /auth/404
sentry.ts           Sentry.init solo con VITE_SENTRY_DSN
stores/             usuario.store.ts (sesión, permisos, login, cargarCuentaActual, logout), ui.store.ts (menú, móvil; persiste menuColapsado)
types/api.ts        tipos de las respuestas del API (Grupo, Movimiento, InventarioActual, ResultadoTabla<T>…)
tema.ts             tokens del tema claro de antd 6 (traducidos de las antiguas variables LESS)
styles/layout-plantilla.css  reglas estructurales del layout de la plantilla sobre antd (temporal, fase 6)
global.scss         estilos de la plantilla (kit-vendors/{bootstrap,perfect-scrollbar}, kit-core, cui-styles)
layouts/            index.jsx (raíz: elige Public/Auth/Main, protege rutas, guarda ultimaVisitada, <Outlet/>), Main, Auth, Public
services/
  axios/index.ts    apiClient (interceptores: token, renovación, error → notifica y rechaza), conToken(url), PeticionBase<T>
  axios/<recurso>/  20 servicios en TypeScript (grupos, usuarios, inventarioActual, movimientos, …)
  menu/index.js     menú estático con roles por entrada
pages/
  administracion/   usuarios, proyectos, proveedores, areas, bodegas
  catalogos/        1.general … 7.inventarioVisual, articulos (detalle/editar/validado)
  operaciones/      1.prestamos, 2.devoluciones, 3.bajas, 4.compras, 5.altas, 6.rentaExterna, 7.inventario, 8.previo, movimiento, componentes
  reportes/         por-usuario, de-cierre
  componentes/      formularios y modales compartidos (precios, claves, características, archivos, comentarios, imágenes)
  auth/             login, 401, 404, 500, 503
components/
  Titulo.tsx        fija document.title ("Sony Almacén | …"), sustituye a react-helmet
  ui/Comentario.tsx comentario (autor, fecha, contenido, acciones); sustituye a Comment de antd 4
  cleanui/          layout (TopBar, Menu/MenuLeft, Breadcrumbs, Footer), system (ACL, Auth/Login, Errors), styles/mixins.scss
  kit/core/         mixins.scss (mixins SCSS de cleanui)
  kit-core, kit-vendors, cui-styles   estilos globales vía global.scss (utilidades kit__utils__*, ajustes antd/Bootstrap)
  mixins.scss       punto de entrada de mixins para los .module.scss de cleanui
helpers/            funcionesExtras.jsx, storage.ts (token y localStorage), limpiarCache.ts, fechas.ts (dayjs), feedback.ts (notification/message con contexto de <App>)
test/               setup.ts (jest-dom, matchMedia, MSW) y servidor.ts (manejadores del API para pruebas)
```

Tamaño tras la fase 1 del plan 01: 263 archivos / ≈ 21,7 k LOC de JS (antes 961 / ≈ 76 k); el negocio real son ≈ 130 archivos / ≈ 17 k LOC.
Demos, `kit/widgets`, `kit-widgets`, `cui-layout`, `cui-system`, MagicBell e idiomas distintos de `es-MX` se borraron en la fase 1.

## Flujo de autenticación

1. `pages/auth/login` → `cleanui/system/Auth/Login` → `useUsuarioStore.login(correo, contraseña)` →
   `services/axios/autorizacion.login`: `POST /auth/login {c, p}` (sin `ip`: la toma el API) y guarda `t`
   con `helpers/storage`. Si va bien, carga la cuenta y `Login` navega a `localStorage.ultimaVisitada` o a `/`.
2. Al arrancar (`index.tsx`), si hay token, `cargarCuentaActual()` → `GET /user/current` → `permisos`
   (códigos de rol). Mientras tanto el layout raíz no pinta nada; sin sesión manda a `/auth/login`.
3. Interceptor de request: cabecera `auth` con el token. Interceptor de respuesta: si llega cabecera `t`, la
   guarda (renovación). Interceptor de error: muestra `notification.error` y **rechaza** la promesa.
4. `components/cleanui/system/ACL` (`roles`, `redirect`, `defaultRedirect`) envuelve cada página y
   bloque sensible: oculta `children` si `permisos` no intersecta `roles`; con `redirect` navega a `/auth/401`.
5. El menú (`services/menu`) filtra entradas por `role`; `ADMINISTRADOR` ve todo.
6. `logout()` llama a `POST /auth/logout` y, falle o no, borra token, `ultimaVisitada` y permisos.

## Convenciones del código de negocio

- Páginas = `index.jsx` por ruta + carpeta `componentes/` con formularios (`forma*.jsx`), tablas
  (`tabla*.jsx`) y columnas (`columnas*.jsx`). Código nuevo en `.ts/.tsx`.
- Tablas server-side con antd `Table` y el contrato `list-antd` del API
  (`{ results, pagination: { current, pageSize, total, totalItems }, filtered }`); filtros y orden se
  envían como `{ sortField, sortOrder, pagination, filters }`.
- Formularios con `Form.useForm` (antd 6); fechas con `dayjs`; códigos de barras leídos con
  escáner en `operaciones/componentes/formaAC.jsx`.
- Importaciones absolutas desde `src` (`tsconfig.json` `baseUrl` + `vite-tsconfig-paths`): `components/…`,
  `services/…`, `pages/…`, `stores/…`. Variables de entorno con `import.meta.env.VITE_*`.
- Pruebas con Vitest + MSW en `stores/` y `services/` (`*.test.ts` junto al código). ESLint 10 + Prettier 3
  (sin punto y coma, comillas simples, 100 col).

### Estilos (transitorio hasta la fase 6)

`index.tsx` carga `antd/dist/reset.css` → Bootstrap → perfect-scrollbar → `global.scss` → `styles/layout-plantilla.css`;
antd 6 inyecta sus estilos en tiempo de ejecución con el tema de `tema.ts` (`ConfigProvider theme`) y
la separación de `Tag` (`ConfigProvider tag`). Ya no hay
LESS, ni `data-kit-theme`, ni ajustes de antd 4 de la plantilla (`kit-vendors/antd`).

## Despliegue

`deploy-production.sh`: `npm version patch` (package.json + lock), commit y tag git, `npm ci && npm run build`, `rsync` de
`build/` al servidor y `tar.gz` en `deploy_history/`. `deploy.sh` (pruebas) solo hace rsync de `build/`.
