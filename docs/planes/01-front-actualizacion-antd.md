# Plan 01 · Front: actualizar dependencias y eliminar Clean UI (solo Ant Design)

> **Para quien ejecute este plan (Sonnet/Opus):** trabaja fase por fase, en el orden
> indicado. Cada fase termina con sus **criterios de aceptación** verificados y un commit
> propio en una rama `front/fase-N-…`. No avances de fase con el build roto. Si una
> decisión abierta (sección 2) no está resuelta, usa la opción marcada **(por defecto)**.
> Lee antes `front/CLAUDE.md`, `docs/front/arquitectura.md` y `docs/hallazgos-codigo.md`.

## 1. Situación de partida (resumen de `docs/front/arquitectura.md`)

| Aspecto | Estado actual |
|---|---|
| Tooling | Create React App 3.4.1 + `react-app-rewired` + `customize-cra`; Node 10.24.1 (`.nvmrc`); Yarn 1; `node-sass` 4; `less` 3 + `less-loader` 5 |
| UI | React 16.13, antd 4.2 (API v4 + restos v3 como `Row type="flex"`), `@ant-design/icons` 4, Bootstrap 4 CSS + `reactstrap`, 296 archivos `.scss` del template |
| Estado | redux 4 + redux-saga 1.1 + `connected-react-router` 6 + `react-router-dom` 5 (hash history) |
| Código | 961 archivos / 76 k LOC. **Negocio real ≈ 130 archivos / 17 k LOC** (`pages/{administracion,catalogos,operaciones,reportes,componentes,auth}`, `layouts`, `redux`, `services`). El resto (≈ 47 k LOC) es template: `components/kit*`, `components/cleanui`, `components/cui-*`, 184 páginas demo |
| Dependencias de negocio hacia Clean UI | `components/cleanui/system/ACL` (76 archivos), páginas de error 401/404/500/503 (4), `Auth/Login` (1), layouts `Main`/`Auth` (5 componentes de `cleanui/layout`), store `settings` (≈ 25 llaves de tema/menú), clases CSS utilitarias de Bootstrap/kit (`card`, `card-body`, `mr-3`, `kit__utils__heading`…) en ≈ 60 archivos |
| Pruebas | **Ninguna** (0 archivos de test) |

## 2. Decisiones de diseño (y alternativas)

| # | Decisión | Por defecto | Alternativa | Motivo |
|---|---|---|---|---|
| D1 | Bundler | **Vite 8 + `@vitejs/plugin-react`** | Mantener CRA/rewired | CRA está abandonado y no corre en Node ≥ 18 con `node-sass`. |
| D2 | Node | **24 LTS** (`.nvmrc` = `24`) | 22.22+ | Mínimo para React Router 8 es Node 22.22; Vite 8 pide 20.19/22.12+. |
| D3 | Gestor de paquetes | **npm** (unifica con `api/package-lock.json`) | pnpm | Yarn 1 está congelado. Elimina `yarn.lock`. |
| D4 | React | **19.3** | 18.3 | antd 6 exige ≥ 18 y recomienda 19; RR8 exige 19.2.7+. |
| D5 | Router | **`react-router` 8** (sin `react-router-dom`, que desaparece en v8) | `react-router` 7 | Permite `createHashRouter` + data APIs; se conserva hash routing para no cambiar el despliegue estático. |
| D6 | Estado | **redux 5 + react-redux 9 + redux-saga 1.5**, sin `connected-react-router` | Migrar a Redux Toolkit / RTK Query | Mínimo riesgo; la navegación desde sagas se hace con el `router.navigate` exportado. La migración a RTK se puede hacer después. |
| D7 | Ant Design | **6.7.x + `@ant-design/icons` 6.x**, pasando por 5.29 (último v5) con codemods | Quedarse en 5.x | El usuario pide la versión más reciente; la guía oficial exige pasar por v5 primero. |
| D8 | Fechas | **dayjs** (lo que usa antd 5/6) sustituyendo `moment` en 49 archivos | `@ant-design/moment-webpack-plugin` | El plugin es solo webpack; Vite no lo soporta. |
| D9 | Estilos | **Tokens de antd (`ConfigProvider theme`) + CSS Modules puntuales + un `utilities.css` de ≈ 30 líneas** para las clases utilitarias que hoy vienen de Bootstrap | Tailwind | Evita tocar los 60 archivos que usan `mr-3`/`card` en la misma fase que la migración. |
| D10 | Idioma UI | Solo `es-MX` (se elimina `react-intl`) | Mantener i18n | Solo cleanui usa `react-intl`; la app es monolingüe. |
| D11 | `<title>` | `<title>` nativo de React 19 (metadatos hoistados) en vez de `react-helmet` (124 usos) | `react-helmet-async` | Menos dependencias; cambio mecánico `<Helmet title="X"/>` → `<title>Sony Almacén | X</title>`. |
| D12 | TypeScript | **Fuera de alcance**: se renombra `.js` → `.jsx` (Vite lo exige) y se habilita `allowJs`; archivos nuevos pueden ser `.tsx` | Migrar todo a TS | Reduce el riesgo; se deja preparado. |
| D13 | Query string | Mantener `query-string` (versión actual) | `useSearchParams` | 28 archivos; se cambia gradualmente. |
| D14 | Pruebas | **Vitest 5 + Testing Library 16 + MSW** (unitarias/componentes) y **Playwright** (humo e2e) | Jest | Vitest es nativo de Vite. |

## 3. Versiones objetivo (verificadas en npm el 2026-11-07)

| Paquete | Actual | Objetivo |
|---|---|---|
| node | 10.24.1 | 24.x LTS |
| react / react-dom | 16.13 | 19.3.x |
| antd | 4.2 | 5.29.x (intermedio) → 6.7.x |
| @ant-design/icons | 4.1 | 5.x (intermedio) → 6.3.x |
| react-router(-dom) | 5.1 | `react-router` 8.5.x |
| redux / react-redux / redux-saga | 4 / 7 / 1.1 | 5.0 / 9.3 / 1.5 |
| axios | 1.1 | 1.21.x |
| moment → dayjs | 2.24 | dayjs 1.11.x |
| vite / @vitejs/plugin-react | — | 8.3.x / 6.2.x |
| vitest / @testing-library/react / msw / playwright | — | 5.1 / 16.3 / última / 1.65 |
| eslint / prettier | 6 (airbnb 17) / 1.19 | 10.x (flat config) / 3.9 |
| sass (dart) | node-sass 4 | `sass` última (solo si quedan `.scss`) |

**Se eliminan** (ver fase 1 y 6): bootstrap, reactstrap, chart.js, react-chartjs-2, chartist,
chartist-plugin-tooltips-updated, react-chartist, react-c3js, react-stockcharts, d3-dsv, d3-format,
d3-time-format, draft-js, react-draft-wysiwyg, react-jvectormap, react-sortable-tree,
react-sortablejs, sortablejs, react-stickynode, @rowno/sparkline, react-highlight-words,
react-resizable, react-perfect-scrollbar, nprogress, react-intl, react-helmet,
react-transition-group, connected-react-router, history, store, qs, clear-cache, prop-types,
lodash, classnames (opcional), customize-cra, react-app-rewired, react-scripts, node-sass, less,
less-loader, babel-plugin-import, @babel/plugin-proposal-decorators, webpackbar, eslint-config-airbnb,
stylelint*, lint-staged (reinstalar versión actual si se quiere pre-commit).

**Se conservan**: antd, @ant-design/icons, axios, dayjs, redux, react-redux, redux-saga,
redux-logger (solo dev), query-string, `@magicbell/magicbell-react` (**ver duda Q6**).

## 4. Fases

Cada fase lista: objetivo, pasos, archivos, pruebas y criterios de aceptación.

### Fase 0 · Línea base y red de seguridad

**Objetivo:** poder detectar regresiones aunque hoy no haya pruebas.

1. Crear rama `front/fase-0-linea-base` desde la rama de trabajo.
2. Documentar el **inventario funcional** en `docs/front/inventario-rutas.md`: las 58 rutas de
   negocio de `src/router.js` con su rol (`services/menu/index.js`), el componente y los
   endpoints que consume (grep de `services/axios/*` en cada página). Marcar las 10 rutas
   críticas: `/auth/login`, `/catalogo/general`, `/catalogo/por-codigos`, `/prestamos/nuevo`,
   `/prestamos/operacion`, `/devoluciones/nuevo`, `/compras/nuevo`, `/compras/operacion`,
   `/bajas/nuevo`, `/movimientos/detalle`.
3. Intentar construir el proyecto legado para capturas de referencia:
   `nvm install 14 && nvm use 14 && yarn install --frozen-lockfile && yarn build`.
   Si compila, servir `build/` y, con Playwright (Chromium preinstalado), guardar una captura por
   ruta crítica en `docs/front/baseline/*.png` usando un API real o de pruebas. Si no compila
   (probable por `node-sass`), registrar el motivo y continuar: la referencia será el checklist.
4. Escribir `docs/front/checklist-humo.md`: para cada ruta crítica, 3-5 verificaciones manuales
   (carga sin error en consola, tabla pagina, formulario envía, notificación de error del API se
   muestra, permisos ACL redirigen a `/auth/401`).
5. Añadir `.nvmrc` = `24`, `.npmrc` (`engine-strict=true`), campo `engines` en `package.json`.

**Aceptación:** existen los tres documentos; `git status` limpio; commit.

### Fase 1 · Eliminar código muerto del template

**Objetivo:** bajar de 76 k a ≈ 20 k LOC antes de tocar dependencias. No cambia comportamiento.

1. Instalar herramienta de análisis de imports (solo dev, temporal): `npx knip` o
   `npx madge --orphans src`. Confirmar que **nada de negocio** importa lo que se va a borrar
   (`grep -rn "components/kit\|components/cui-\|pages/\(advanced\|apps\|cards\|charts\|dashboard\|ecommerce\|icons\|tables\|ui-kits\|widgets\)" src --include=*.js | grep -v "^src/components/kit\|^src/components/cui\|^src/pages/\(advanced\|apps\|cards\|charts\|dashboard\|ecommerce\|icons\|tables\|ui-kits\|widgets\)"`
   debe devolver solo `src/router.js` (`/dashboard/alpha`) y `components/cleanui/layout/Breadcrumbs` (enlace a `/dashboard/alpha`).
2. Borrar: `src/pages/{advanced,apps,cards,charts,dashboard,ecommerce,icons,tables,ui-kits,widgets}`,
   `src/components/{kit,kit-core,kit-vendors,kit-widgets,cui-layout,cui-styles,cui-system}`,
   `src/components/cleanui/layout/TopBar/{Actions,FavPages,IssuesHistory,LanguageSwitcher,ProjectManagement,Search}`,
   `src/components/cleanui/layout/Menu/MenuTop`, `src/components/cleanui/layout/SupportChat`,
   `src/components/cleanui/system/Auth/{ForgotPassword,Lockscreen}`, `src/pages/auth/{forgot-password,lockscreen,register}`,
   `src/services/menu.service.js`, `src/services/firebase.auth.service.js`, `src/services/menu/roles.txt`,
   `src/serviceWorker.js`, `src/locales/{en-US,fr-FR,ru-RU,zh-CN}.js`, `notes/`, `.vb/`, `.cloudflare/`,
   `tsconfing.json`, `public/resources` (revisar antes: conservar favicon/logo/manifest).
   Borrar también los archivos vacíos: `pages/reportes/{1.general,4.ultimoUso}/index.js`,
   `pages/reportes/2.movimientos/inde.js`, `pages/reportes/componentes/tablaListadosReportes.js`,
   `pages/catalogos/articulos/editarInventarioActual/**`, `pages/administracion/parametros/editar/index.js`
   (y la ruta/menú comentados que los referencian).
3. En `src/router.js` quitar la ruta `/dashboard/alpha`; en `cleanui/layout/Breadcrumbs` apuntar
   "Inicio" a `/`. En `src/components/mixins.scss` y `src/global.scss` eliminar los `@import`
   de `kit*`/`cui-*`/vendors borrados (dejar temporalmente bootstrap y los estilos de `cleanui`).
4. Quitar de `package.json` las dependencias listadas en §3 cuyo único consumidor era el código
   borrado (todas las de gráficas, editor, sortable, mapas, sparkline, highlight, resizable, prop-types,
   lodash, react-stickynode). Mantener aún bootstrap/reactstrap/nprogress/perfect-scrollbar/store/intl/helmet
   (los usa `cleanui` o el negocio).
5. Renombrar `src/pages/componentes/imaganesEnCarrusel.js` → `imagenesEnCarrusel.js` y sus 2-3 imports.

**Pruebas:** `yarn build` bajo Node 14 (si la fase 0 logró compilar) o, en su defecto,
`npx knip`/`madge` sin huérfanos nuevos y `npx eslint src` sin errores de import.
**Aceptación:** LOC de `src` ≈ 20 k; ningún `import` roto (`grep` + lint); commit.

### Fase 2 · Tooling: CRA → Vite 8, Node 24, npm

**Objetivo:** compilar con herramientas actuales **sin cambiar aún React/antd** (React 16.14, antd 4.24).

1. `nvm use 24`. Borrar `yarn.lock`, `config-overrides.js`, `jsconfig.json`, `.eslintrc.js`,
   `.prettierrc`, `.stylelintrc.json`, `.prettierignore`, `.stylelintignore`.
2. Renombrar todos los `.js` de `src` que contengan JSX a `.jsx` (script:
   `for f in $(grep -rl "<[A-Za-z]" src --include=*.js); do git mv "$f" "${f%.js}.jsx"; done`),
   corrigiendo los imports que incluían extensión explícita (casi ninguno).
3. Crear `vite.config.js`:
   - `plugins: [react({ jsxRuntime: 'classic' })]` (React 16 no trae `jsx-runtime`; se cambiará en fase 3).
   - `resolve.alias`: `{ '@': '/src' }` **y** mantener imports absolutos actuales
     (`components/...`, `services/...`, `pages/...`, `redux/...`, `layouts/...`, `helpers/...`, `index`)
     con `vite-tsconfig-paths` + `jsconfig.json`/`tsconfig.json` (`baseUrl: "src"`) **o** alias explícitos por carpeta.
     El import `from 'index'` (history/store) es circular: en esta fase crear `src/store.js` y
     `src/history.js` y redirigir esos imports (sed) para romper el ciclo.
   - `css.preprocessorOptions.less = { javascriptEnabled: true }`; `sass` (dart) para los `.scss` restantes.
   - `define`/env: cambiar `process.env.REACT_APP_*` → `import.meta.env.VITE_*` en `services/axios/index.js`,
     `cleanui/layout/TopBar`, `index.jsx`; `.env.example` con `VITE_API_URL`, `VITE_MAGICBELL_*`.
   - `server.proxy['/api'] → http://localhost:4100` (desarrollo contra el API local).
   - `build.outDir: 'build'` (los scripts de despliegue hacen rsync de `build/`).
4. Mover `public/index.html` a `front/index.html` con `<script type="module" src="/src/index.jsx">`
   y quitar `%PUBLIC_URL%`. Conservar `<html lang="es">`, fuentes e iconos solo si cleanui los usa aún.
5. Estilos de antd 4 bajo Vite: sustituir las tres importaciones `.less` de `index.jsx`
   (core + temas `kit/vendors/antd/themes/*` ya borrados) por `import 'antd/dist/antd.less'`
   (o `antd.dark.less` según el tema por defecto). El plugin `AntdThemeLoader` desaparece; el toggle de
   tema de `Sidebar` queda inoperante hasta la fase 6 (aceptable, se documenta).
6. `package.json`: `"type": "module"`? **No** (hay `require` en configs heredadas); dejar CommonJS/ESM mixto
   que Vite tolera. Scripts: `dev`, `build`, `preview`, `lint`, `test`, `test:e2e`.
   Dependencias: `vite`, `@vitejs/plugin-react`, `sass`, `less`, `eslint@10` + `@eslint/js` +
   `eslint-plugin-react` + `eslint-plugin-react-hooks` + `eslint-config-prettier` (flat config
   `eslint.config.js`), `prettier@3` (`.prettierrc.json` sin `parser: babylon`), `vite-tsconfig-paths`.
7. `npm install && npm run build && npm run preview` y pasar el checklist de humo a mano (o con el
   script Playwright de la fase 0 apuntando a `preview`).

**Pruebas:** build sin warnings de módulos no resueltos; `npm run lint`; checklist de humo.
**Aceptación:** la app arranca con Vite, login y las 10 rutas críticas funcionan igual que antes. Commit.

### Fase 3 · React 19 + React Router 8 + Redux 5

1. `npm i react@19 react-dom@19 react-router@8 redux@5 react-redux@9 redux-saga@1.5 && npm un react-router-dom connected-react-router history react-transition-group`.
   Quitar `jsxRuntime: 'classic'` del plugin.
2. `src/index.jsx`: `ReactDOM.render` → `createRoot(...).render(...)`. Eliminar `routerMiddleware`,
   `routerReducer` (`redux/reducers.js` deja de recibir `history`).
3. Router (`src/router.jsx`): construir con `createHashRouter([{ element: <Layout/>, children: routes }])`
   + `<RouterProvider router={router}/>`. Exportar `router` desde `src/router.jsx` para que las sagas
   naveguen con `router.navigate(url)` (sustituye `history.push` en `redux/user/sagas.js`,
   `cleanui/system/ACL`, `cleanui/system/Auth/Login`, `layouts/index.js`). Rutas con `lazy` de React
   (`React.lazy` + `Suspense` con `<Spin/>`), sin animación de transición (se elimina `routerAnimation`).
   Equivalencias mecánicas: `useHistory()` → `useNavigate()` (46 archivos; `history.push(x)` →
   `navigate(x)`, `history.goBack()` → `navigate(-1)`, `history.replace` → `navigate(x,{replace:true})`),
   `<Redirect to>` → `<Navigate to replace/>`, `<Switch>`/`<Route component>` → `<Routes>`/`<Route element>`,
   `useLocation` igual, `useParams` igual, `withRouter` → hooks. Importar todo desde `'react-router'`.
4. `layouts/index.jsx`: usar `useLocation()` para elegir layout (`public`/`auth`/`main`), `useEffect`
   para `scrollTo`; quitar `NProgress` (sustituir por `<Spin>` del `Suspense`) y `Helmet`
   (`<title>` nativo). Eliminar `react-helmet` y `nprogress` del `package.json` y cambiar los 64
   `<Helmet title="X" />` por `<title>Sony Almacén | X</title>` (sed con revisión manual de los que
   tienen título dinámico).
5. React 19: revisar `defaultProps` en componentes función (eliminar), `ReactDOM.findDOMNode`,
   refs como string, `this.refs`, `componentWillReceiveProps` (solo hay 1 componente de clase:
   `administracion/componentes/tablaGeneral.js`, convertir a función si usa APIs retiradas).
   antd 4.24 con React 19 **no está soportado**: instalar temporalmente
   `@ant-design/v5-patch-for-react-19` **no** aplica a v4; por eso esta fase debe ejecutarse
   **junto con la fase 4** si aparecen errores de `findDOMNode`/`ReactDOM.render` en consola
   (lo más probable). Orden recomendado si ocurre: hacer el commit de fase 3 con React **18.3**
   (que sí soporta antd 4.24) y subir a 19 al final de la fase 4.
6. `redux/user/sagas.js`: corregir LOGOUT para que limpie `nombre/correo/permisos` (bug).
   `redux/settings`: dejar solo `theme`, `locale`, `isMenuCollapsed`, `isMobileView` (el resto se
   borra en fase 6; aquí solo se quita la saga `SETUP` que lee la query string con `qs` y el
   `history.listen`).

**Pruebas:** build; checklist de humo; **primeras pruebas automatizadas** (ver fase 7, pero crear ya
`src/services/axios/index.test.js` y `src/redux/user/sagas.test.js` para asegurar login/logout).
**Aceptación:** sin warnings de React en consola en las rutas críticas; navegación, redirecciones de
ACL y `localStorage.ultimaVisitada` funcionan. Commit.

### Fase 4 · antd 4 → 5.29 (último v5) y moment → dayjs

1. `npm i antd@5 @ant-design/icons@5 dayjs && npm un moment` (y quitar `resolutions.moment`).
2. Codemod oficial: `npx -p @ant-design/codemod-v5 antd5-codemod src` (convierte `visible`→`open`,
   `dropdownClassName`→`popupClassName`, imports de `Comment`/`PageHeader` a `@ant-design/compatible`,
   quita imports de estilos v4). Revisar el diff completo.
3. Cambios manuales (conteos de `docs/front/arquitectura.md`):
   - `Row type="flex"` (35 usos / 20 archivos): quitar la prop.
   - `<Menu.Item>`/`<SubMenu>` (42 usos / 10 archivos) → prop `items` (arreglos `{key,label,icon,children}`).
   - `Dropdown overlay={<Menu/>}` (4 archivos de negocio) → `menu={{ items, onClick }}`.
   - `Tabs.TabPane` (58 usos / 6 archivos) → `items=[{key,label,children}]`.
   - `Collapse.Panel` (1), `Steps.Step` (1) → `items`.
   - `Comment` (`pages/componentes/comentarios.jsx`): reemplazar por un componente propio
     `src/components/ui/Comentario.jsx` con `List`/`Avatar`/`Typography` (evitar `@ant-design/compatible`,
     que desaparecerá).
   - `import Modal from 'antd/lib/modal/Modal'` → `import { Modal } from 'antd'`.
   - Locale: `import es_ES from 'antd/locale/es_ES'` + `dayjs.locale('es-mx')` (`dayjs/locale/es-mx`);
     borrar `src/locales/es-MX.js` y `localization.jsx` (queda `ConfigProvider` en `index.jsx`).
   - `moment` → `dayjs` en 49 archivos: `moment(x)` → `dayjs(x)`, `.format` igual, `.isBefore/.isAfter`
     igual, `moment.locale('es')` → `dayjs.locale('es-mx')`, `moment().startOf('day')` igual,
     `moment.utc` → plugin `utc`, `.diff` igual, `.add(1,'days')` → `'day'`. Los `DatePicker`
     reciben/entregan `Dayjs`. Revisar `usuarios/componentes/forma.jsx` y
     `operaciones/componentes/formaConfiguracionGrupo.jsx`.
   - `notification`/`message` estáticos (110 usos): envolver la app en `<App>` de antd y crear
     `src/helpers/feedback.js` que exponga la instancia obtenida con `App.useApp()` (patrón
     oficial) para que las llamadas desde sagas/servicios (`services/axios/index.js`) sigan
     funcionando con el tema.
   - `hideRequiredMark` → `requiredMark={false}` (3 usos).
   - Eliminar `antd/dist/antd.less`, `less` y `sass` si ya no hay `.scss` de negocio salvo los dos
     módulos (`pages/componentes/style.module.scss`, `layouts/Auth/style.module.scss`): convertirlos a
     CSS Modules (`.module.css`) y quitar `sass`.
   - Tema: `<ConfigProvider theme={{ token: { colorPrimary: '#4b7cf3' }, algorithm: theme.defaultAlgorithm }}>`.
4. Ahora sí `npm i react@19 react-dom@19` si la fase 3 se quedó en 18 (antd 5.29 soporta React 19
   con `@ant-design/v5-patch-for-react-19`; instalarlo e importarlo una vez en `index.jsx`).

**Pruebas:** build sin warnings `[antd: X] ... is deprecated`; `npx antd lint ./src` (CLI oficial)
sin hallazgos bloqueantes; pruebas de componentes de los formularios con fecha (`DatePicker` entrega
`dayjs`); checklist de humo.
**Aceptación:** cero warnings de deprecación en consola en las rutas críticas. Commit.

### Fase 5 · antd 5 → 6.7 + icons 6

1. `npm i antd@6 @ant-design/icons@6 && npm un @ant-design/v5-patch-for-react-19` (React ≥ 18 nativo).
2. Ejecutar `npx antd lint ./src` y `npx antd migrate 5 6 --apply ./src` (CLI oficial; produce un
   informe de APIs obsoletas) y aplicar la tabla de renombres de la guía v6
   (https://ant.design/docs/react/migration-v6). Las que afectan a este código base:
   `Space direction`→`orientation`, `Divider type`→`orientation`, `Card bordered`→`variant`,
   `Input/Select bordered`→`variant`, `Modal/Drawer bodyStyle`→`styles.body`,
   `destroyOnClose`→`destroyOnHidden`, `Tabs tabPosition`→`tabPlacement`, `Table onSelectAll`→`onChange`,
   `Alert message`→`title`, `notification message`→`title`, `Tag bordered={false}`→`variant="filled"`,
   `Button.Group`→`Space.Compact`, `size="default"`→`"medium"` en Avatar/Badge/Card/Progress/Steps/Switch/Spin,
   `Descriptions children`→`items`, `Breadcrumb.Item`→`items`, `Statistic.Countdown`→`Statistic.Timer`.
3. Variables CSS activadas por defecto: comprobar que no hay selectores propios que dependan de
   clases internas (`.ant-*`) en los CSS Modules restantes; si los hay, usar `classNames`/`styles`
   semánticos del componente.
4. `Tag` perdió el `margin-inline-end`: si las tablas de operaciones muestran tags pegados, añadir
   `tag.styles.root` en `ConfigProvider`.

**Pruebas:** build; `npx antd lint ./src` limpio; comparación visual con `docs/front/baseline` o
checklist; pruebas unitarias/e2e de fase 7 (si ya existen) verdes.
**Aceptación:** `package.json` con antd 6.x, sin `@ant-design/compatible` ni patch. Commit.

### Fase 6 · Reemplazar Clean UI por Ant Design puro

**Objetivo:** borrar `src/components/cleanui`, `global.scss`, `components/mixins.scss`, Bootstrap y
el store `settings` de tema.

Nueva estructura:

```
src/
  app/
    App.jsx                 ConfigProvider(theme es_ES) + antd <App> + Provider + RouterProvider
    theme.js                tokens; algorithm dark/default según localStorage('tema')
    layouts/
      MainLayout.jsx        antd Layout: Sider (Menu items) + Header (usuario, versión, tema, MagicBell) + Content + Footer
      AuthLayout.jsx        centrado, tarjeta de login
      PublicLayout.jsx
    menu/
      menuItems.js          deriva de services/menu/index.js: {key,label,icon:<Icon/>,children,role}
      useMenuItems.js       filtra por permisos (ADMINISTRADOR ve todo) y marca selectedKeys
    auth/
      ACL.jsx               misma API que cleanui/system/ACL: roles, redirect, defaultRedirect; usa useSelector + useNavigate
      LoginPage.jsx         antd Form (correo, contraseña), dispara LOGIN
    errors/
      ErrorPage.jsx         antd Result; variantes 401/404/500/503
      ErrorBoundary.jsx     sustituye layouts/Main/manejandoErrores
  styles/
    utilities.css           .mr-2 .mr-3 .mr-4 .text-truncate .kit__utils__heading (≈ 30 líneas, temporal)
```

Pasos:
1. Implementar lo anterior. Iconos del menú: mapear las cadenas `icmn icmn-book`, `fe fe-*` de
   `services/menu/index.js` a componentes de `@ant-design/icons` (tabla en `menuItems.js`).
2. Sustituir imports en negocio: `components/cleanui/system/ACL` (76 archivos) → `app/auth/ACL`
   (sed); páginas `pages/auth/{401,404,500,503}` → `app/errors/ErrorPage` con prop `code`;
   `pages/auth/login` → `app/auth/LoginPage`.
3. Breadcrumbs: `Breadcrumb items` generado con `useMatches()` o a partir del menú (`findByUrl`).
4. Store `settings`: dejar `{ theme: 'light'|'dark', isMenuCollapsed, isMobileView }` persistido con un
   helper `src/helpers/storage.js` (reemplaza la librería `store`). Borrar `menuColor`, `primaryColor`,
   `routerAnimation`, `menuLayoutType`, `isCardShadow`, etc. y todos sus consumidores.
5. Borrar: `src/components/cleanui`, `src/global.scss`, `src/components/mixins.scss`, `src/layouts`,
   `src/localization.jsx`, `src/locales`, `public/` fuentes/iconos del template y las etiquetas
   correspondientes en `index.html` (`data-kit-theme`, Mukta, icomoon, feather).
6. `npm un bootstrap reactstrap react-perfect-scrollbar store qs clear-cache react-intl classnames`
   (si `classnames` ya no se usa).
7. Clases utilitarias en páginas de negocio: `card`/`card-body`/`card-header` (64/61/15 usos) →
   `<Card title=...>`; `kit__utils__heading` → `Typography.Title level={5}`; `mr-*` → `Space`/`Flex`
   o `utilities.css`. Hacerlo por carpeta (administracion → catalogos → operaciones → reportes) con
   un commit por carpeta; `utilities.css` cubre lo que quede pendiente y se elimina al final.
8. Login: eliminar la dependencia de `https://api.ipify.org` (`services/axios/autorizacion`): enviar
   `ip` solo si el API lo requiere (el API acepta `ip` indefinida → "desconodida"). Decisión **Q7**.

**Pruebas:**
- Unitarias: `ACL` (autorizado/no autorizado/redirect), `useMenuItems` (filtro por rol),
  `theme.js` (persistencia), `ErrorPage`.
- Componentes: `LoginPage` envía `{c,p}` y guarda `t`; `MainLayout` muestra nombre de usuario y colapsa.
- e2e Playwright: login → menú visible según permisos → navegar a cada ruta crítica → sin errores de
  consola (`page.on('pageerror')`) → logout.
- Visual: capturas de las 10 rutas críticas en `docs/front/after/` para comparar con la línea base.

**Aceptación:** `grep -rn "cleanui\|cui__\|kit__\|bootstrap\|reactstrap" src` devuelve 0 resultados
(salvo `utilities.css` si quedó). Commit.

### Fase 7 · Pruebas, calidad y CI

1. **Vitest**: `vitest.config.js` (`environment: 'jsdom'`, `setupFiles: src/test/setup.js` con
   `@testing-library/jest-dom`, `matchMedia` mock para antd). MSW (`src/test/server.js`) con handlers
   para `/auth/login`, `/user/current`, `/groups/list-antd`, `/current-inventory/*`.
   Pruebas mínimas obligatorias:
   - `services/axios/index.test.js`: interceptor añade header `auth`; guarda header `t`; **el interceptor
     de error debe rechazar** (`Promise.reject`) — corregir el bug `return error` y asegurar que las
     páginas que dependían del comportamiento anterior (`.then` recibiendo el error) sigan funcionando.
   - `services/axios/grupos.test.js`: `finalizar` llama `PUT /groups/closure/:id` (corregir ruta).
   - `redux/user/sagas.test.js`: LOGIN éxito/fallo, LOAD_CURRENT_ACCOUNT, LOGOUT limpia `permisos`.
   - `app/auth/ACL.test.jsx`, `app/menu/useMenuItems.test.js`.
   - 1 prueba de componente por formulario crítico: `operaciones/componentes/formaAC`,
     `operaciones/componentes/formaConfiguracionGrupo`, `pages/componentes/formaPrecios`.
2. **Playwright** (`e2e/`): `playwright.config.js` con `webServer: npm run preview` y `baseURL`;
   API simulada con MSW en modo navegador **o** API real de pruebas (`API_URL` por variable); pruebas:
   `login.spec.js`, `catalogo.spec.js`, `prestamo-devolucion.spec.js` (flujo completo contra API real
   de pruebas si existe; ver plan 02). Ejecutar con `--trace off`.
3. **Lint/format**: `eslint.config.js` (flat) con `@eslint/js`, `eslint-plugin-react`,
   `eslint-plugin-react-hooks`, `eslint-config-prettier`; `prettier` 3; script `lint` en CI.
   Eliminar los 68 `console.*` de negocio o encapsularlos en `helpers/log.js` que solo imprime en dev.
4. **CI**: `.github/workflows/front.yml`: `npm ci`, `npm run lint`, `npm test -- --run`,
   `npm run build`, `npx playwright test` (Chromium) en PRs que toquen `front/**`.
5. Corregir el resto de hallazgos de `docs/hallazgos-codigo.md` (sección Front) que no se hayan
   resuelto en fases anteriores. Actualizar `front/README.md`, `front/CLAUDE.md`, `deploy*.sh`
   (quitar `$new_version` indefinido en `deploy.sh`, `yarn` → `npm`).

**Aceptación:** CI verde; cobertura mínima 60 % en `src/services` y `src/redux`; checklist de humo
completo firmado en `docs/front/checklist-humo.md`.

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| antd 4 no funciona con React 19 (fase 3) | Subir a React 18.3 primero; React 19 al cerrar fase 4. |
| `hash history`: enlaces guardados por usuarios (`#/catalogo/general`) | Se conserva `createHashRouter`; mismas rutas. |
| El interceptor de error de axios hoy **resuelve** con el error; al corregirlo pueden aparecer `.catch` no previstos | Fase 7 revisa cada `.then` de `services/axios/*` (27 archivos) y añade `try/catch` donde falte; cubrir con pruebas. |
| Páginas con `moment` en lógica no visible (reportes) | grep `moment` debe quedar en 0; probar los dos reportes manualmente. |
| Permisos ACL: el nuevo `ACL` debe aceptar exactamente las mismas props | Pruebas unitarias con los 3 modos (`redirect` booleano, string, sin redirect). |
| Despliegue: scripts rsync de `build/` | `build.outDir='build'` en Vite. |

## 6. Dudas abiertas (responder antes de la fase 2)

- **Q1** ¿Aceptas migrar de CRA a **Vite** y de Yarn 1 a **npm**? (D1, D3)
- **Q2** ¿React Router **8** (`react-router`, sin `react-router-dom`) o quedarse en 7? (D5)
- **Q3** ¿Mantener **redux-saga** o aprovechar para migrar a Redux Toolkit (+RTK Query)? (D6)
- **Q4** ¿Se requiere el **tema oscuro**? Si no, se elimina el toggle y `theme` del store.
- **Q5** ¿Se mantiene la app monolingüe en es-MX (eliminar `react-intl`)? (D10)
- **Q6** ¿Sigue en uso **MagicBell** (notificaciones en TopBar)? Si no, se elimina `@magicbell/magicbell-react`
  y sus dos variables `VITE_MAGICBELL_*`.
- **Q7** ¿Es necesario registrar la **IP pública** del cliente en el login (`api.ipify.org`)? Si no, se elimina.
- **Q8** ¿Hay un API de pruebas (o Docker) disponible para los e2e de Playwright, o se usan solo mocks (MSW)?
- **Q9** ¿Convertir a **TypeScript** en una fase posterior? (D12)
