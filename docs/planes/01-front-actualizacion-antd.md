# Plan 01 · Front: actualizar dependencias, migrar a TypeScript y eliminar Clean UI (solo Ant Design)

> **Para quien ejecute este plan (Sonnet/Opus):** trabaja fase por fase, en el orden
> indicado. Cada fase termina con sus **criterios de aceptación** verificados y un commit
> propio en una rama `front/fase-N-…`. No avances de fase con el build roto. Las decisiones de
> la sección 2 ya están **tomadas por el propietario del proyecto** (ver `docs/decisiones.md`);
> no las reabras. Lee antes `front/CLAUDE.md`, `docs/front/arquitectura.md` y
> `docs/hallazgos-codigo.md`. Este plan tiene dependencias con el plan 02 (API): sección 5.

## 1. Situación de partida (resumen de `docs/front/arquitectura.md`)

| Aspecto | Estado actual |
|---|---|
| Tooling | Create React App 3.4.1 + `react-app-rewired` + `customize-cra`; Node 10.24.1 (`.nvmrc`); Yarn 1; `node-sass` 4; `less` 3 + `less-loader` 5 |
| UI | React 16.13, antd 4.2 (API v4 + restos v3 como `Row type="flex"`), `@ant-design/icons` 4, Bootstrap 4 CSS + `reactstrap`, 296 archivos `.scss` del template |
| Estado | redux 4 + redux-saga 1.1 + `connected-react-router` 6 + `react-router-dom` 5 (hash history) |
| Código | 961 archivos / 76 k LOC en JavaScript. **Negocio real ≈ 130 archivos / 17 k LOC** (`pages/{administracion,catalogos,operaciones,reportes,componentes,auth}`, `layouts`, `redux`, `services`). El resto (≈ 47 k LOC) es template: `components/kit*`, `components/cleanui`, `components/cui-*`, 184 páginas demo |
| Dependencias de negocio hacia Clean UI | `components/cleanui/system/ACL` (76 archivos), páginas de error 401/404/500/503 (4), `Auth/Login` (1), layouts `Main`/`Auth` (5 componentes de `cleanui/layout`), store `settings` (≈ 25 llaves de tema/menú), clases CSS utilitarias de Bootstrap/kit (`card`, `card-body`, `mr-3`, `kit__utils__heading`…) en ≈ 60 archivos |
| Pruebas | **Ninguna** (0 archivos de test) |

## 2. Decisiones de diseño (tomadas)

| # | Decisión | Elegido | Motivo / consecuencia |
|---|---|---|---|
| D1 | Bundler | **Vite 8 + `@vitejs/plugin-react`** | CRA está abandonado y no corre en Node ≥ 18 con `node-sass`. |
| D2 | Node | **24 LTS** (`.nvmrc` = `24`) | Mínimo para React Router 8 es Node 22.22; Vite 8 pide 20.19/22.12+. |
| D3 | Gestor de paquetes | **npm** | Unifica con `api/package-lock.json`. Se elimina `yarn.lock`. |
| D4 | React | **19.3** | antd 6 exige ≥ 18 y recomienda 19; RR8 exige 19.2.7+. |
| D5 | Router | **`react-router` 8** (sin `react-router-dom`) | `createHashRouter` + data APIs; se conserva hash routing para no cambiar el despliegue estático. |
| D6 | Estado | **Zustand 5** (sustituye redux + redux-saga + react-redux + connected-react-router) | Stores `useUsuarioStore` (sesión, permisos), `useUiStore` (menú colapsado), `useNotificacionesStore`. Las acciones asíncronas (login, cargar cuenta) son funciones `async` dentro del store; no hay sagas. |
| D7 | Ant Design | **6.7.x + `@ant-design/icons` 6.x**, pasando por 5.29 (último v5) con codemods | La guía oficial exige pasar por v5 primero. |
| D8 | Fechas | **dayjs** (lo que usa antd 5/6) sustituyendo `moment` en 49 archivos | El plugin de moment es solo webpack. |
| D9 | Estilos | **Tokens de antd (`ConfigProvider theme`) + CSS Modules puntuales + `utilities.css` temporal** | Evita tocar los 60 archivos con `mr-3`/`card` en la misma fase que la migración. |
| D10 | Tema | **Solo tema claro.** Se elimina el toggle, `data-kit-theme`, `theme` del store y los `.less` de temas | No requerido. |
| D11 | Idioma UI | Solo `es-MX`; se elimina `react-intl` | La app es monolingüe. |
| D12 | `<title>` | `<title>` nativo de React 19 en vez de `react-helmet` (124 usos) | Cambio mecánico `<Helmet title="X"/>` → `<title>Sony Almacén \| X</title>`. |
| D13 | **TypeScript** | **Migrar a la par** del resto del plan: `tsconfig.json` con `strict: true` y `allowJs: true` desde la fase 2; `services/`, `stores/`, `app/` y `types/` nacen en TS; las páginas se convierten carpeta por carpeta en la fase 6 (mismo barrido que quita las clases de Bootstrap). Al cerrar el plan, `allowJs: false` y 0 archivos `.js/.jsx` en `src`. | Petición del propietario. |
| D14 | Notificaciones | **Se elimina MagicBell.** Se deja un componente `NotificacionesCampana` + store que consume el sistema propio del API (plan 02, fase 7). Hasta que exista, el componente se oculta tras `VITE_NOTIFICACIONES=off`. | Se desarrollará un sistema propio. |
| D15 | IP del cliente en login | **Se elimina la llamada a `api.ipify.org`.** El API toma la IP de la conexión (`req.ip` con `trust proxy`, plan 02 fase 2). El front deja de enviar `ip`. | Sigue siendo necesaria la IP, pero del lado servidor. |
| D16 | Observabilidad | **Sentry preparado** (`@sentry/react` 11 + `@sentry/vite-plugin` para source maps), inicializado solo si existe `VITE_SENTRY_DSN`. | |
| D17 | Query string | Mantener `query-string` (versión actual); migrar a `useSearchParams` gradualmente | 28 archivos. |
| D18 | Pruebas | **Vitest 5 + Testing Library 16 + MSW 3** (unitarias/componentes) y **Playwright** con **MSW en el navegador** (humo e2e). No existe API de pruebas. | Cuando el plan 02 (fase 0) entregue `docker-compose.test.yml`, los e2e podrán correr contra API real como segunda variante. |

## 3. Versiones objetivo (verificadas en npm el 2026-11-07)

| Paquete | Actual | Objetivo |
|---|---|---|
| node | 10.24.1 | 24.x LTS |
| typescript | — | 5.9.x (evaluar 7.x al final; `@types/react` 19.3) |
| react / react-dom | 16.13 | 19.3.x |
| antd | 4.2 | 5.29.x (intermedio) → 6.7.x |
| @ant-design/icons | 4.1 | 5.x (intermedio) → 6.3.x |
| react-router(-dom) | 5.1 | `react-router` 8.5.x |
| zustand | — | 5.1.x (sustituye redux 4 / react-redux 7 / redux-saga 1.1 / connected-react-router 6) |
| axios | 1.1 | 1.21.x |
| moment → dayjs | 2.24 | dayjs 1.11.x |
| @sentry/react, @sentry/vite-plugin | — | 11.11.x |
| vite / @vitejs/plugin-react / vite-tsconfig-paths | — | 8.3.x / 6.2.x / 6.1.x |
| vitest / @testing-library/react / jest-dom / user-event / msw / playwright | — | 5.1 / 16.3 / 7.0 / 14.6 / 3.0 / 1.65 |
| eslint / typescript-eslint / prettier | 6 (airbnb 17) / — / 1.19 | 10.x (flat config) / 8.72 / 3.9 |

**Se eliminan**: bootstrap, reactstrap, chart.js, react-chartjs-2, chartist, chartist-plugin-tooltips-updated,
react-chartist, react-c3js, react-stockcharts, d3-dsv, d3-format, d3-time-format, draft-js,
react-draft-wysiwyg, react-jvectormap, react-sortable-tree, react-sortablejs, sortablejs, react-stickynode,
@rowno/sparkline, react-highlight-words, react-resizable, react-perfect-scrollbar, nprogress, react-intl,
react-helmet, react-transition-group, connected-react-router, history, redux, react-redux, redux-saga,
redux-logger, store, qs, clear-cache, prop-types, lodash, classnames, **@magicbell/magicbell-react**,
customize-cra, react-app-rewired, react-scripts, node-sass, less, less-loader, babel-plugin-import,
@babel/plugin-proposal-decorators, webpackbar, eslint-config-airbnb, stylelint*, lint-staged.

**Se conservan**: antd, @ant-design/icons, axios, dayjs, query-string.

## 4. Fases

### Fase 0 · Línea base y red de seguridad

1. Rama `front/fase-0-linea-base`.
2. `docs/front/inventario-rutas.md`: las 58 rutas de negocio de `src/router.js` con su rol
   (`services/menu/index.js`), componente y endpoints consumidos (grep de `services/axios/*`). Marcar las
   10 rutas críticas: `/auth/login`, `/catalogo/general`, `/catalogo/por-codigos`, `/prestamos/nuevo`,
   `/prestamos/operacion`, `/devoluciones/nuevo`, `/compras/nuevo`, `/compras/operacion`, `/bajas/nuevo`,
   `/movimientos/detalle`.
3. Intentar construir el proyecto legado para capturas de referencia:
   `nvm install 14 && nvm use 14 && yarn install --frozen-lockfile && yarn build`. Si compila, servir
   `build/` y guardar con Playwright una captura por ruta crítica en `docs/front/baseline/*.png`
   (con MSW en el navegador o un API local). Si no compila (probable por `node-sass`), anotar el motivo.
4. `docs/front/checklist-humo.md`: 3-5 verificaciones manuales por ruta crítica.
5. `.nvmrc` = `24`, `.npmrc` (`engine-strict=true`), `engines` en `package.json`.

**Aceptación:** existen los tres documentos; commit.

> **Ejecutada (2026-11-07).** El legado compila con Node 14 + Yarn 1 (`docs/front/baseline/README.md`); hay
> capturas de las 10 rutas críticas con API simulado. Desviación en el paso 5: `engines.node >=24` hace que
> Yarn rechace `yarn build` en Node 14 (y rompería `deploy-production.sh` hasta la fase 2), así que
> `.nvmrc` queda en `14` (versión verificada para el legado), `.npmrc` sí se crea y **`.nvmrc = 24` +
> `engines` se mueven al paso 1 de la fase 2**. El inventario encontró 67 rutas activas (no 58).

### Fase 1 · Eliminar código muerto del template

1. Confirmar con `npx knip` / `npx madge --orphans src` y con grep que nada de negocio importa lo que se
   borra (solo `src/router.js` → `/dashboard/alpha` y `cleanui/layout/Breadcrumbs` → enlace a `/dashboard/alpha`).
2. Borrar: `src/pages/{advanced,apps,cards,charts,dashboard,ecommerce,icons,tables,ui-kits,widgets}`,
   `src/components/{kit,kit-core,kit-vendors,kit-widgets,cui-layout,cui-styles,cui-system}`,
   `src/components/cleanui/layout/TopBar/{Actions,FavPages,IssuesHistory,LanguageSwitcher,ProjectManagement,Search}`,
   `src/components/cleanui/layout/Menu/MenuTop`, `src/components/cleanui/layout/SupportChat`,
   `src/components/cleanui/system/Auth/{ForgotPassword,Lockscreen}`, `src/pages/auth/{forgot-password,lockscreen,register}`,
   `src/services/menu.service.js`, `src/services/firebase.auth.service.js`, `src/services/menu/roles.txt`,
   `src/serviceWorker.js`, `src/locales/{en-US,fr-FR,ru-RU,zh-CN}.js`, `notes/`, `.vb/`, `.cloudflare/`,
   `tsconfing.json`, `public/resources` (conservar favicon/logo/manifest), y los archivos vacíos:
   `pages/reportes/{1.general,4.ultimoUso}/index.js`, `pages/reportes/2.movimientos/inde.js`,
   `pages/reportes/componentes/tablaListadosReportes.js`, `pages/catalogos/articulos/editarInventarioActual/**`,
   `pages/administracion/parametros/editar/index.js` (y la ruta/menú comentados que los referencian).
3. **MagicBell:** quitar el componente de `cleanui/layout/TopBar/index.js` y `@magicbell/magicbell-react`
   del `package.json`; eliminar `REACT_APP_MAGICBELL_*` de `.env.example`.
4. `src/router.js`: quitar `/dashboard/alpha`; Breadcrumbs "Inicio" → `/`. En `components/mixins.scss` y
   `global.scss` eliminar los `@import` de `kit*`/`cui-*`/vendors borrados.
5. Quitar de `package.json` las dependencias cuyo único consumidor era el código borrado (gráficas,
   editor, sortable, mapas, sparkline, highlight, resizable, prop-types, lodash, react-stickynode, magicbell).
6. Renombrar `src/pages/componentes/imaganesEnCarrusel.js` → `imagenesEnCarrusel.js` y sus imports.

**Pruebas:** `yarn build` bajo Node 14 si la fase 0 compiló; si no, `knip`/`madge` sin huérfanos nuevos y
`npx eslint src` sin errores de import.
**Aceptación:** LOC de `src` ≈ 20 k; ningún import roto; commit.

> **Ejecutada (2026-11-07).** `src`: 961 → 263 archivos; 21,7 k LOC de JS (27,2 k con SCSS/LESS). `yarn build`
> (Node 14) compila y las capturas de las 10 rutas críticas coinciden con la línea base salvo la campana de
> MagicBell. Desviaciones respecto al paso 2, porque el build se rompía:
> - **No se borran** `kit-core`, `kit-vendors/{antd,bootstrap,nprogress,perfect-scrollbar}` ni `cui-styles`
>   (los importa `global.scss`: utilidades `kit__utils__*`, ajustes de antd/Bootstrap), ni
>   `kit/core/mixins.scss` y `kit/vendors/antd/themes` (los usan `components/mixins.scss` y `index.js`).
>   Sí se borró todo lo demás de `kit*`/`cui-*` y los estilos que nadie importaba. Lo restante desaparece con
>   `global.scss` en las fases 4-6.
> - **`public/resources/fonts` se conserva** (iconos `icmn`/`fe` del menú y fuentes de `index.html`; se retira
>   en la fase 6, paso 4). De `public/resources/images` solo queda `logo.svg`.
> - También se retiró `reactstrap` (sin consumidores) y la plantilla `services/HOW-TO-AUTH-APP.md`.
> - Quedan 4 archivos de negocio no importados por ninguna ruta (`operaciones/7.inventario/nuevo`,
>   `reportes/5.inventario`, `catalogos/7.inventarioVisual/componentes/resultadosValidaciones.js`,
>   `operaciones/componentes/accionesTablasGrupos.js`): no se borran sin confirmar con el propietario.

### Fase 2 · Tooling: CRA → Vite 8 + TypeScript, Node 24, npm

**Objetivo:** compilar con herramientas actuales **sin cambiar aún React/antd** (React 16.14, antd 4.24).

1. `.nvmrc` = `24` y `"engines": { "node": ">=24" }` en `package.json` (aplazados desde la fase 0).
   `nvm use 24`. Borrar `yarn.lock`, `config-overrides.js`, `jsconfig.json`, `.eslintrc.js`,
   `.prettierrc`, `.stylelintrc.json`, `.prettierignore`, `.stylelintignore`.
2. **TypeScript**: `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"], "module": "ESNext",
       "moduleResolution": "bundler", "jsx": "react-jsx", "strict": true, "noEmit": true,
       "allowJs": true, "checkJs": false, "skipLibCheck": true, "isolatedModules": true,
       "resolveJsonModule": true, "baseUrl": "src", "paths": { "@/*": ["*"] },
       "types": ["vite/client", "vitest/globals"]
     },
     "include": ["src", "e2e", "vite.config.ts", "vitest.config.ts"]
   }
   ```
   `allowJs: true` y `checkJs: false` permiten convivir con los `.jsx` hasta que se conviertan.
   Nuevo código **siempre** en `.ts/.tsx`.
3. Renombrar los `.js` de `src` que contienen JSX a `.jsx` (Vite lo exige):
   `for f in $(grep -rlE "<[A-Z][A-Za-z]*[ />]|</[A-Za-z]" src --include=*.js); do git mv "$f" "${f%.js}.jsx"; done`
   y revisar manualmente la lista (el patrón es heurístico). Los `.js` sin JSX (`services/axios/*`,
   `helpers/*`) se renombran directamente a `.ts` y se tipan en la fase 3.
4. `vite.config.ts`:
   - `plugins: [react({ jsxRuntime: 'classic' }), tsconfigPaths()]` (React 16 no trae `jsx-runtime`; se
     cambia a automático en fase 3). `vite-tsconfig-paths` resuelve los imports absolutos actuales
     (`components/...`, `services/...`, `pages/...`, `redux/...`, `layouts/...`, `helpers/...`, `index`) gracias
     a `baseUrl: "src"`. El import circular `from 'index'` (history/store) se rompe aquí creando
     `src/store.js` y `src/history.js` y redirigiendo esos imports (sed).
   - `css.preprocessorOptions.less = { javascriptEnabled: true }`; `sass` (dart) para los `.scss` restantes.
   - Variables: `process.env.REACT_APP_*` → `import.meta.env.VITE_*` (`services/axios/index`, `index.jsx`);
     `src/vite-env.d.ts` con `ImportMetaEnv` tipado; `.env.example` con `VITE_API_URL`, `VITE_SENTRY_DSN`,
     `VITE_NOTIFICACIONES`.
   - `server.proxy['/api'] → http://localhost:4100` (dev contra API local).
   - `build.outDir: 'build'` (los scripts de despliegue hacen rsync de `build/`), `sourcemap: true`.
5. Mover `public/index.html` a `front/index.html` con `<script type="module" src="/src/index.jsx">`;
   quitar `%PUBLIC_URL%` y `data-kit-theme`. Conservar `<html lang="es">`.
6. Estilos antd 4 bajo Vite: sustituir las tres importaciones `.less` de `index.jsx` por
   `import 'antd/dist/antd.less'`. El plugin `AntdThemeLoader` desaparece y el toggle de tema de `Sidebar`
   se **elimina** (D10): borrar `cleanui/layout/Sidebar` y su uso en `layouts/Main` y `layouts/Auth`.
7. `package.json`: scripts `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `lint`, `typecheck`,
   `test`, `test:e2e`. Dependencias dev: `vite`, `@vitejs/plugin-react`, `vite-tsconfig-paths`,
   `typescript`, `@types/react@16`, `@types/react-dom@16` (temporal), `sass`, `less`, `eslint@10`,
   `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
   `eslint-config-prettier`, `prettier@3`. `eslint.config.js` flat; `.prettierrc.json` sin `parser: babylon`.
8. `npm install && npm run build && npm run preview` y pasar el checklist de humo.

**Pruebas:** `npm run typecheck` sin errores (los `.jsx` no se verifican aún); build sin módulos sin
resolver; `npm run lint`; checklist de humo.
**Aceptación:** la app arranca con Vite; login y las 10 rutas críticas funcionan igual que antes. Commit.

### Fase 3 · React 19 + React Router 8 + Zustand (fin de redux) + servicios en TypeScript

1. `npm i react@19 react-dom@19 react-router@8 zustand@5 && npm i -D @types/react@19 @types/react-dom@19 && npm un react-router-dom connected-react-router history redux react-redux redux-saga redux-logger react-transition-group store qs`.
   Plugin React a `jsxRuntime` automático (quitar `classic`).
2. **Stores Zustand** (`src/stores/`, TypeScript):
   - `usuario.store.ts`: estado `{ id, nombre, correo, permisos: string[], autorizado, cargando }`; acciones
     `login(c, p)`, `cargarCuentaActual()`, `logout()`. Persistencia del token en `localStorage('t')` vía
     `src/helpers/storage.ts` (sustituye la librería `store`). Reemplaza `redux/user` + sagas. `logout`
     **limpia `permisos`** (corrige F4).
   - `ui.store.ts`: `{ menuColapsado, esMovil }` con `persist` middleware de zustand (solo `menuColapsado`).
     Reemplaza `redux/settings`; se eliminan `theme`, `menuColor`, `primaryColor`, `routerAnimation`,
     `menuLayoutType`, `isCardShadow`, etc. y la saga `SETUP` que leía la query string (F5).
   - `menu.store.ts` o simple módulo `app/menu/menuItems.ts` (el menú es estático; no necesita store).
   - Fuera de componentes (servicios, interceptores): `useUsuarioStore.getState()`.
   - Borrar `src/redux/` completo y `src/store.js`.
3. **Router** (`src/router.tsx`): `createHashRouter([{ element: <Layout/>, errorElement: <ErrorPage code={500}/>, children: routes }])`
   + `<RouterProvider router={router}/>`. Exportar `router` para navegar fuera de componentes
   (`router.navigate(url)`), sustituyendo `history.push` en `ACL`, `Login` y `layouts/index`. Rutas con
   `lazy` (`React.lazy` + `Suspense` con `<Spin/>`), sin animación de transición.
   Equivalencias: `useHistory()` → `useNavigate()` (46 archivos; `history.push(x)` → `navigate(x)`,
   `history.goBack()` → `navigate(-1)`, `history.replace` → `navigate(x,{replace:true})`), `<Redirect to>` →
   `<Navigate to replace/>`, `<Switch>`/`<Route component>` → `<Routes>`/`<Route element>`, `withRouter` →
   hooks. Importar todo desde `'react-router'`. `localStorage.ultimaVisitada` se conserva (en `layouts/index`).
4. `layouts/index.tsx`: `useLocation()` para elegir layout; quitar `NProgress` (→ `<Spin>` del `Suspense`) y
   `Helmet` (→ `<title>` nativo; sed sobre los 64 `<Helmet title="X" />` con revisión de los dinámicos).
   `npm un react-helmet nprogress`.
5. **Servicios en TypeScript** (`src/services/axios/*.ts`): tipar `PeticionBase` con genéricos
   (`listado<T>(endpoint, params): Promise<ResultadoTabla<T>>`), crear `src/types/api.ts` con las interfaces
   del API (`Usuario`, `Grupo`, `Movimiento`, `InventarioActual`, `Operacion`, `Producto`, `Proyecto`,
   `ResultadoTabla<T>`, `PaginacionAntd`), derivadas de `api/src/entity/*.ts`. **Corregir el interceptor de
   error** para que rechace (`return Promise.reject(error)`) (F1) y revisar los 27 servicios y sus
   consumidores para añadir `try/catch` donde falte. `grupos.finalizar` → `closure/:id` (F3).
   `autorizacion.login`: dejar de llamar a `api.ipify.org` y de enviar `ip` (D15; requiere plan 02 fase 2
   desplegado o, mientras tanto, el API sigue aceptando `ip` indefinida → `"desconodida"`).
   `subirArchivos`: obtener la cabecera `auth` desde `storage.ts`, no de `localStorage` directo (F11).
6. **Sentry** (D16): `src/sentry.ts` con `Sentry.init` solo si `import.meta.env.VITE_SENTRY_DSN`;
   `@sentry/vite-plugin` para subir source maps en `build` cuando existan `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`.
   `ErrorBoundary` de Sentry envolviendo el `RouterProvider`.
7. React 19: eliminar `defaultProps` en componentes función, `findDOMNode`, refs string; convertir el único
   componente de clase (`administracion/componentes/tablaGeneral`). **antd 4.24 no soporta React 19**: si
   aparecen errores de `findDOMNode`/`ReactDOM.render`, cerrar esta fase con **React 18.3** y subir a 19
   al terminar la fase 4.

**Pruebas (primeras automatizadas, Vitest):** `stores/usuario.store.test.ts` (login éxito/fallo con MSW,
`cargarCuentaActual`, `logout` limpia permisos y token), `stores/ui.store.test.ts` (persistencia),
`services/axios/index.test.ts` (header `auth`, guarda `t`, **rechaza** en error), `services/axios/grupos.test.ts`
(`finalizar` → `PUT /groups/closure/:id`). Build; checklist de humo.
**Aceptación:** sin warnings de React en consola en las rutas críticas; `src/redux` no existe; `npm run typecheck` verde. Commit.

### Fase 4 · antd 4 → 5.29 (último v5) y moment → dayjs

1. `npm i antd@5 @ant-design/icons@5 dayjs && npm un moment` (quitar `resolutions.moment`).
2. Codemod oficial: `npx -p @ant-design/codemod-v5 antd5-codemod src` (`visible`→`open`,
   `dropdownClassName`→`popupClassName`, `Comment`/`PageHeader` → `@ant-design/compatible`, quita estilos v4).
   Revisar el diff completo.
3. Cambios manuales (conteos en `docs/front/arquitectura.md`): `Row type="flex"` (35/20 archivos) quitar;
   `<Menu.Item>`/`<SubMenu>` (42/10) → `items`; `Dropdown overlay` (4 de negocio) → `menu={{ items, onClick }}`;
   `Tabs.TabPane` (58/6), `Collapse.Panel` (1), `Steps.Step` (1) → `items`; `Comment`
   (`pages/componentes/comentarios`) → componente propio `src/components/ui/Comentario.tsx` con
   `List`/`Avatar`/`Typography` (no usar `@ant-design/compatible`); `import Modal from 'antd/lib/modal/Modal'`
   → `import { Modal } from 'antd'`; locale `import es_ES from 'antd/locale/es_ES'` + `dayjs.locale('es-mx')`
   (borrar `src/locales` y `localization`); `moment` → `dayjs` en 49 archivos (`moment(x)`→`dayjs(x)`,
   `.add(1,'days')`→`'day'`, `moment.utc`→plugin `utc`; `DatePicker` entrega `Dayjs`; revisar
   `usuarios/componentes/forma` y `operaciones/componentes/formaConfiguracionGrupo`); `hideRequiredMark` →
   `requiredMark={false}` (3).
4. `notification`/`message` estáticos (110 usos): envolver la app en `<App>` de antd y crear
   `src/helpers/feedback.ts` que exponga la instancia de `App.useApp()` (patrón oficial) para usarla desde
   stores/servicios.
5. Eliminar `antd/dist/antd.less`, `less`; convertir los dos `.scss` de negocio
   (`pages/componentes/style.module.scss`, `layouts/Auth/style.module.scss`) a `.module.css` y quitar `sass`.
   Tema: `<ConfigProvider locale={es_ES} theme={{ token: { colorPrimary: '#4b7cf3' } }}>` (solo claro, D10).
6. Si la fase 3 quedó en React 18: `npm i react@19 react-dom@19` + `@ant-design/v5-patch-for-react-19` importado una vez en `index.tsx`.

**Pruebas:** build sin warnings `[antd: X] ... is deprecated`; `npx antd lint ./src` (CLI oficial) sin
bloqueantes; pruebas de componente para los formularios con fecha; checklist.
**Aceptación:** cero warnings de deprecación en consola en las rutas críticas. Commit.

### Fase 5 · antd 5 → 6.7 + icons 6

1. `npm i antd@6 @ant-design/icons@6 && npm un @ant-design/v5-patch-for-react-19`.
2. `npx antd lint ./src` y `npx antd migrate 5 6 --apply ./src`; aplicar la tabla de renombres de la guía
   v6 (https://ant.design/docs/react/migration-v6). Las que afectan a este código: `Space direction`→`orientation`,
   `Divider type`→`orientation`, `Card/Input/Select bordered`→`variant`, `Modal/Drawer bodyStyle`→`styles.body`,
   `destroyOnClose`→`destroyOnHidden`, `Tabs tabPosition`→`tabPlacement`, `Table onSelectAll`→`onChange`,
   `Alert/notification message`→`title`, `Tag bordered={false}`→`variant="filled"`, `Button.Group`→`Space.Compact`,
   `size="default"`→`"medium"` (Avatar/Badge/Card/Progress/Steps/Switch/Spin), `Descriptions children`→`items`,
   `Breadcrumb.Item`→`items`, `Statistic.Countdown`→`Statistic.Timer`.
3. Variables CSS activas por defecto: revisar selectores propios sobre `.ant-*`; usar `classNames`/`styles` semánticos.
4. `Tag` perdió el `margin-inline-end`: si hace falta, `tag.styles.root` en `ConfigProvider`.

**Pruebas:** build; `npx antd lint ./src` limpio; comparación con `docs/front/baseline` o checklist; suite Vitest verde.
**Aceptación:** antd 6.x sin `@ant-design/compatible` ni patch. Commit.

### Fase 6 · Reemplazar Clean UI por Ant Design puro y convertir páginas a TypeScript

**Objetivo:** borrar `src/components/cleanui`, `global.scss`, `components/mixins.scss`, Bootstrap, y dejar
`src` 100 % TypeScript.

Nueva estructura:

```
src/
  app/
    App.tsx                  ConfigProvider(es_ES, tema claro) + antd <App> + RouterProvider
    layouts/
      MainLayout.tsx         antd Layout: Sider (Menu items) + Header (usuario, versión, NotificacionesCampana) + Content + Footer
      AuthLayout.tsx         centrado, tarjeta de login
      PublicLayout.tsx
    menu/
      menuItems.ts           deriva de services/menu/index: {key,label,icon:<Icon/>,children,role}
      useMenuItems.ts        filtra por permisos (ADMINISTRADOR ve todo) y marca selectedKeys
    auth/
      ACL.tsx                misma API que cleanui/system/ACL: roles, redirect, defaultRedirect; usa useUsuarioStore + useNavigate
      LoginPage.tsx          antd Form (correo, contraseña) → usuarioStore.login
    errors/
      ErrorPage.tsx          antd Result; code 401|404|500|503
      ErrorBoundary.tsx      sustituye layouts/Main/manejandoErrores (o Sentry.ErrorBoundary)
    notificaciones/
      NotificacionesCampana.tsx   Badge + Dropdown; lee useNotificacionesStore; oculto si VITE_NOTIFICACIONES==='off'
  stores/                    usuario, ui, notificaciones
  services/axios/            ya en TS (fase 3)
  types/api.ts
  styles/
    utilities.css            .mr-2 .mr-3 .mr-4 .text-truncate .kit__utils__heading (≈ 30 líneas, temporal)
```

Pasos:
1. Implementar lo anterior en TypeScript. Iconos del menú: mapear `icmn icmn-book`, `fe fe-*` de
   `services/menu/index` a componentes de `@ant-design/icons`.
2. Sustituir imports en negocio: `components/cleanui/system/ACL` (76 archivos) → `app/auth/ACL` (sed);
   `pages/auth/{401,404,500,503}` → `app/errors/ErrorPage`; `pages/auth/login` → `app/auth/LoginPage`.
3. Breadcrumbs: `Breadcrumb items` a partir del menú (`findByUrl`) o `useMatches()`.
4. Borrar `src/components/cleanui`, `src/global.scss`, `src/components/mixins.scss`, `src/layouts`,
   fuentes/iconos del template en `public/` e `index.html` (Mukta, icomoon, feather).
5. `npm un bootstrap reactstrap react-perfect-scrollbar clear-cache react-intl classnames`.
6. **Conversión de páginas a TS + limpieza de clases utilitarias**, por carpeta y con un commit por carpeta
   (`administracion` → `catalogos` → `operaciones` → `reportes` → `componentes`): renombrar `.jsx` → `.tsx`,
   tipar props/estado con los tipos de `types/api.ts`, sustituir `card`/`card-body`/`card-header` (64/61/15 usos)
   por `<Card title=...>`, `kit__utils__heading` → `Typography.Title level={5}`, `mr-*` → `Space`/`Flex`.
   Hasta terminar el barrido, `utilities.css` cubre lo pendiente; al final se elimina junto con
   `allowJs` en `tsconfig.json`.
7. Quitar `console.*` de negocio (68) o encapsular en `helpers/log.ts` (solo dev).

**Pruebas:**
- Unitarias: `ACL` (autorizado / no autorizado / redirect booleano / redirect string), `useMenuItems`
  (filtro por rol), `ErrorPage`, `NotificacionesCampana` (oculta con flag; muestra conteo con store).
- Componentes: `LoginPage` envía `{c,p}` sin `ip` y guarda `t`; `MainLayout` muestra nombre y colapsa.
- e2e Playwright + MSW navegador: login → menú según permisos → cada ruta crítica → sin `pageerror` → logout.
- Visual: capturas en `docs/front/after/` para comparar con la línea base.

**Aceptación:** `grep -rn "cleanui\|cui__\|kit__\|bootstrap\|reactstrap\|magicbell" src` = 0 (salvo
`utilities.css` si quedó); `find src -name "*.js" -o -name "*.jsx"` = 0; `tsc --noEmit` con `strict` verde. Commit.

### Fase 7 · Pruebas, calidad y CI

1. **Vitest**: `vitest.config.ts` (`environment: 'jsdom'`, `setupFiles: src/test/setup.ts` con jest-dom y
   mock de `matchMedia`). MSW (`src/test/server.ts`) con handlers tipados para `/auth/login`, `/user/current`,
   `/groups/list-antd`, `/groups/activity`, `/current-inventory/*`, `/notifications/*` (plan 02 fase 7).
   Además de las pruebas ya creadas en fases 3-6: una prueba de componente por formulario crítico
   (`operaciones/componentes/formaAC`, `operaciones/componentes/formaConfiguracionGrupo`, `pages/componentes/formaPrecios`).
2. **Playwright** (`e2e/`): `playwright.config.ts` con `webServer: npm run preview`; **MSW en modo
   navegador** (`msw/browser`, `setupWorker`) activado con `VITE_MOCK_API=true` en el build de e2e;
   pruebas `login.spec.ts`, `catalogo.spec.ts`, `prestamo-devolucion.spec.ts`. Ejecutar con `--trace off`.
   Variante `E2E_API_URL` para correr contra el `docker-compose.test.yml` del plan 02 cuando exista.
3. **Lint/format**: `eslint.config.js` con `typescript-eslint` (`recommendedTypeChecked`), react, react-hooks,
   prettier. `npm run lint` y `npm run typecheck` en CI.
4. **CI**: `.github/workflows/front.yml`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --run`,
   `npm run build`, `npx playwright test` (Chromium) en PRs que toquen `front/**`.
5. Cerrar los hallazgos de `docs/hallazgos-codigo.md` (sección B) pendientes y marcarlos. Actualizar
   `front/README.md`, `front/CLAUDE.md`, `deploy*.sh` (`yarn` → `npm`, quitar `$new_version` indefinido).

**Aceptación:** CI verde; cobertura mínima 60 % en `src/services` y `src/stores`; checklist de humo firmado.

## 5. Dependencias con el plan 02 (API)

| Front necesita | Plan 02 |
|---|---|
| Login sin `ip` en el body (D15) | Fase 2 ✅: `trust proxy` y `sesion.IP = req.ip`; el body `ip` se ignora |
| URLs de imágenes/miniaturas/reportes con `?auth=<token>` (los `GET /file/*` ya exigen token; `ARCHIVOS_PUBLICOS=true` en el API mantiene el comportamiento viejo mientras el front no lo envíe) | Fase 2 ✅ (API). Front: fase 3, en `services/axios` añadir `conToken(url)` y usarlo en `columnasTablaOperaciones`, `imagenesEnCarrusel`, `subirArchivos` y en las URLs que devuelve `get-response-interface` |
| Respuestas numéricas: `cantidad`, `cantidadAlmacen`, precios y totales llegan como `number` (antes string) | Fase 2 ✅ (API). Front: revisar los `parseFloat`/`Number()` redundantes al tipar `types/api.ts` |
| `PUT /user/renewpassword` ya no devuelve la contraseña (`{ correo, enviado }`) | Fase 2 ✅ (API). Front: la pantalla de regenerar contraseña debe mostrar "enviada por correo" |
| Endpoints de notificaciones para `NotificacionesCampana` (D14) | Fase 7: `GET /notifications`, `PUT /notifications/:id/read`, `GET /notifications/stream` |
| Nuevos campos de `GET /activity/:id` (`fecha`, `relacionesOrigen`, `relacionesDerivadas`, `saldoPendiente`) y 409 con candidatas en `PUT /groups/activity` | Fase 3 |
| API de pruebas para e2e (opcional) | Fase 0 (`docker-compose.test.yml`) |

Mientras el API no esté desplegado con esos cambios, el front funciona igual: `ip` indefinida se registra
como `"desconodida"`, la campana se oculta con `VITE_NOTIFICACIONES=off`, y los campos nuevos son opcionales en `types/api.ts`.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| antd 4 no funciona con React 19 (fase 3) | React 18.3 primero; 19 al cerrar fase 4. |
| `hash history`: enlaces guardados (`#/catalogo/general`) | `createHashRouter`, mismas rutas. |
| El interceptor hoy **resuelve** con el error; al corregirlo aparecen `.catch` no previstos | Fase 3 revisa cada consumidor de `services/axios/*`; pruebas con MSW devolviendo 400/500. |
| Páginas con `moment` en lógica no visible (reportes) | `grep moment` en 0; probar los dos reportes. |
| `ACL` nuevo debe aceptar exactamente las mismas props | Pruebas unitarias con los 3 modos. |
| Conversión a TS descubre errores de tipo reales en páginas | Es el objetivo; corregirlos, no silenciarlos con `any`. `// @ts-expect-error` solo con comentario y hallazgo anotado. |
| Despliegue: rsync de `build/` | `build.outDir='build'`. |
