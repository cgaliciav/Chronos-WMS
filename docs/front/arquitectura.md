# Front · Arquitectura actual

Aplicación React en TypeScript estricto con Ant Design 6, compilada con Vite. Se construyó sobre la plantilla
comercial Clean UI (React CRA), retirada en la fase 6 del plan 01. Consume el API vía `/api/` (proxy inverso) con
JWT en la cabecera `auth`.

## Stack

| Área | Tecnología | Versión |
|---|---|---|
| Build | Vite 8 + `@vitejs/plugin-react` + `vite-tsconfig-paths`; TypeScript 5.9 strict (`tsc -b`, sin JavaScript) | Node 24, npm |
| Calidad | ESLint 10 (flat: typescript-eslint, @eslint-react, react-hooks, prettier), Prettier 3, Vitest 5 (jsdom) + Testing Library 16 + MSW 3 | |
| UI | React 19.3, antd 6.7, `@ant-design/icons` 6 | |
| Estado y rutas | Zustand 5 (`stores/`), `react-router` 8 (`createBrowserRouter`, rutas sin `#` desde v4.1.0) | |
| Observabilidad | `@sentry/react` 11 (solo con `VITE_SENTRY_DSN`) + `@sentry/vite-plugin` (source maps si hay credenciales) | |
| HTTP | axios 1.21 (`src/services/axios/index.ts`) | |
| Fechas | dayjs 1.11 (`helpers/fechas.ts`: plugins y locale `es-mx`) | |
| Estilos | antd 6 CSS-in-JS con tokens y variables CSS (`tema.ts`) + CSS Modules puntuales | |
| i18n | Ninguna librería: textos en español; antd con `locale` `es_ES` | |

## Estructura de `front/src`

```
index.tsx           reset de antd, fechas, Sentry, viewport, recuperación de sesión y
                    createRoot(<ConfigProvider tema><App><RouterProvider/>)
router.tsx          createBrowserRouter: RaizLayout + 67 rutas lazy + "/" según permisos + "*" → /auth/404
tema.ts             tokens del tema claro de antd 6 y separación de Tag
sentry.ts           Sentry.init solo con VITE_SENTRY_DSN
app/
  layouts/          RaizLayout (elige layout, protege rutas, guarda ultimaVisitada), MainLayout (Sider/Drawer, cabecera,
                    migas, ErrorBoundary, pie), AuthLayout, Logo, MenuUsuario, PieDePagina, useVersionApi
  menu/             menuItems.ts (menú con roles e iconos), useMenuItems.tsx (filtro por permisos, selección, migas)
  auth/             ACL.tsx (roles, redirect, defaultRedirect), LoginPage.tsx
  errors/           ErrorPage.tsx (401/404/500/503), ErrorBoundary.tsx
  notificaciones/   NotificacionesCampana.tsx (solo con VITE_NOTIFICACIONES=on)
stores/             usuario.store.ts, ui.store.ts, notificaciones.store.ts
services/axios/     apiClient (interceptores: token, renovación, error → notifica y rechaza), conToken(url), PeticionBase<T>,
                    21 servicios por recurso (incluido notificaciones)
types/api.ts        tipos de las respuestas del API
components/         Titulo.tsx; ui/ Tarjeta, Encabezado, Comentario
helpers/            storage, feedback, fechas, log, limpiarCache, funcionesExtras
pages/
  administracion/   usuarios, proyectos, proveedores, areas, bodegas (+ tipos.ts)
  catalogos/        1.general … 7.inventarioVisual, articulos (detalle/editar/validado) (+ tipos.ts)
  operaciones/      1.prestamos … 8.previo, movimiento, componentes (+ tipos.ts)
  reportes/         por-usuario, de-cierre
  componentes/      formularios y modales compartidos (+ tipos.ts)
test/               setup.ts (jest-dom, matchMedia, ResizeObserver, MSW), servidor.ts, renderizar.tsx, conRouter.tsx
```

Tras la fase 6: 100 % TypeScript; sin plantilla, Bootstrap, Sass, LESS ni fuentes de iconos.

## Flujo de autenticación

1. `app/auth/LoginPage` → `useUsuarioStore.login(correo, contraseña)` →
   `services/axios/autorizacion.login`: `POST /auth/login {c, p}` (sin `ip`: la toma el API) y guarda `t`
   con `helpers/storage`. Si va bien, carga la cuenta y `Login` navega a `localStorage.ultimaVisitada` o a `/`.
2. Al arrancar (`index.tsx`), si hay token, `cargarCuentaActual()` → `GET /user/current` → `permisos`
   (códigos de rol). Mientras tanto el layout raíz no pinta nada; sin sesión manda a `/auth/login`.
3. Interceptor de request: cabecera `auth` con el token. Interceptor de respuesta: si llega cabecera `t`, la
   guarda (renovación). Interceptor de error: muestra `notification.error` y **rechaza** la promesa.
4. `app/auth/ACL` (`roles`, `redirect`, `defaultRedirect`) envuelve cada página y
   bloque sensible: oculta `children` si `permisos` no intersecta `roles`; con `redirect` navega a `/auth/401`.
5. El menú (`app/menu/menuItems.ts` + `useMenuItems`) filtra entradas por `role`; `ADMINISTRADOR` ve todo.
6. `logout()` llama a `POST /auth/logout` y, falle o no, borra token, `ultimaVisitada` y permisos.

## Convenciones del código de negocio

- Páginas = `index.tsx` por ruta + carpeta `componentes/` con formularios (`forma*.tsx`), tablas
  (`tabla*.tsx`) y columnas (`columnas*.tsx`).
- Tablas server-side con antd `Table` y el contrato `list-antd` del API
  (`{ results, pagination: { current, pageSize, total, totalItems }, filtered }`); filtros y orden se
  envían como `{ sortField, sortOrder, pagination, filters }`.
- Formularios con `Form.useForm` (antd 6); fechas con `dayjs`; códigos de barras leídos con
  escáner en `operaciones/componentes/formaAC.tsx`.
- Importaciones absolutas desde `src` (`tsconfig.json` `baseUrl` + `vite-tsconfig-paths`): `components/…`,
  `services/…`, `pages/…`, `stores/…`. Variables de entorno con `import.meta.env.VITE_*`.
- Pruebas con Vitest + MSW en `stores/` y `services/` (`*.test.ts` junto al código). ESLint 10 + Prettier 3
  (sin punto y coma, comillas simples, 100 col).

### Estilos

`index.tsx` carga solo `antd/dist/reset.css`; antd 6 inyecta sus estilos con el tema de `tema.ts`. Las páginas usan
componentes de antd (`Tarjeta`/`Encabezado` de `components/ui`, `Space`, `Flex`, `Typography`) y `style` puntual.

## Despliegue

`deploy-production.sh`: `npm version patch` (package.json + lock), commit y tag git, `npm ci && npm run build`, `rsync` de
`build/` al servidor y `tar.gz` en `deploy_history/`. `deploy.sh` (pruebas) solo hace rsync de `build/`.

### Rutas sin `#` y nginx (desde v4.1.0)

El router usa la history API (`/catalogo/general`, antes `/#/catalogo/general`). Recargar o abrir un enlace directo pide
esa ruta al servidor, así que el contenedor `frontend` (`nginx:1.25-alpine`) debe devolver `index.html` para cualquier
ruta que no sea un archivo: lo hace [`front/nginx.conf`](../../front/nginx.conf). Los enlaces antiguos con `#/` se
convierten al cargar (`helpers/enlacesHash.ts`), y la configuración sirve también los builds anteriores (rollback).

Una sola vez por servidor, **antes** del primer despliegue de v4.1.0 (lo hace una persona; ambos scripts se niegan a
desplegar mientras falte, salvo `OMITIR_VERIFICACION_NGINX=1`):

1. Copiar `front/nginx.conf` a `~/teleset-almacen/front-nginx.conf` (pruebas: `~/teleset-almacen-test/`).
2. En el `docker-compose.yml` de ese directorio, añadir al servicio `frontend`:
   `- ./front-nginx.conf:/etc/nginx/conf.d/default.conf:ro`
3. `docker-compose up -d frontend` y comprobar que `https://<dominio>/catalogo/general` responde 200 con el HTML.

Staging lo hace solo: `infra/staging/docker-compose.staging.yml` monta el archivo y `update-staging.sh` lo copia en
cada corrida.

Versionado: reglas del [`CLAUDE.md` raíz](../../CLAUDE.md) (`vX.Y.Z`, sufijos `-d`/`-s`), versión en `package.json`
(Sentry la usa como `release`). La v4.0.0 marca el cierre de las fases 0-6 del plan 01; como el script de producción
sube el parche, el primer despliegue la publica como v4.0.1. Los cambios se anotan en
[`front/CHANGELOG.md`](../../front/CHANGELOG.md).
