# front/ · guía para agentes

SPA del almacén. **React 19.3 · antd 6.7 · dayjs · Zustand 5 · react-router 8 (history API, data router; `front/nginx.conf` en el servidor) ·
Vite 8 · TypeScript 5.9 strict (100 % TS) · Node 24 · npm**.
Construida originalmente sobre la plantilla Clean UI, ya retirada; el plan
`docs/planes/01-front-actualizacion-antd.md` describe la migración completa.
Arquitectura detallada: `docs/front/arquitectura.md`. Fallos conocidos: `docs/hallazgos-codigo.md` (sección B).
**Estado del plan 01:** fases 0-6 hechas (Vite + TypeScript, React 19 + Router 8 + Zustand, antd 6 + dayjs, layout de
antd puro sin Clean UI y todas las páginas en TS). Siguiente: fase 7 (e2e con Playwright, CI, cobertura).
Rutas, roles y endpoints: `docs/front/inventario-rutas.md`; verificación manual: `docs/front/checklist-humo.md`.
**Versión y changelog:** la versión está en `package.json` (v4.0.0 desde el cierre de las fases 0-6) y sigue las
reglas de versionado del `CLAUDE.md` raíz (`vX.Y.Z`, sufijos `-d`/`-s`). Anota cada cambio visible en la sección
`[Sin publicar]` de `front/CHANGELOG.md`.

Scripts (Node 24, `nvm use`): `npm run dev` (puerto 3000, proxy `/api` → `http://localhost:4100`),
`npm run build` (`tsc -b` + `vite build` a `build/`), `npm run preview`, `npm run lint` (ESLint 10, 0 errores
obligatorio; los avisos del código heredado se toleran), `npm run typecheck`, `npm test` (Vitest + Testing
Library + MSW; `src/test/servidor.ts` tiene los manejadores del API), `npm run format`. Tras cada cambio visible pasa el checklist de humo y, si tocas
estilos o layout, compara capturas con `docs/front/baseline/capturar.js` (acepta `build/` o la URL de `dev`/`preview`);
`docs/front/baseline/flujo-sesion.js` automatiza el humo de sesión (login, menú, ACL, F5, logout).

## Estructura

```
src/pages/administracion/   usuarios, proyectos, proveedores, areas, bodegas
src/pages/catalogos/        búsquedas (general, por códigos, bajas, por proyecto, por facturas, validaciones, inventario visual), articulos/
src/pages/operaciones/      1.prestamos 2.devoluciones 3.bajas 4.compras 5.altas 6.rentaExterna 8.previo movimiento/ componentes/
src/pages/reportes/         por-usuario, de-cierre
src/pages/componentes/      modales/formularios compartidos (precios, claves, características, archivos, comentarios, imágenes)
src/pages/*/tipos.ts        tipos locales de cada área (complementan types/api.ts)
src/components/             Titulo y ui/ (Tarjeta, Encabezado, Comentario)
src/helpers/                storage, feedback, fechas, log, limpiarCache, funcionesExtras (mapeoOpciones, filtrarOpcion, idDeEtiquetado…)
src/app/                    armazón en TS: layouts (Raiz/Main/Auth), menu (menuItems + useMenuItems),
                            auth (ACL, LoginPage), errors (ErrorPage, ErrorBoundary), notificaciones (campana)
src/stores/                 usuario.store.ts (sesión, permisos, login/logout), ui.store.ts (menú colapsado, móvil)
src/services/axios/         TypeScript: apiClient + PeticionBase genérica + 20 clases por recurso; conToken(url)
src/types/api.ts            tipos de las respuestas del API
src/router.tsx              67 rutas (createHashRouter + React.lazy); app/layouts/RaizLayout es el elemento raíz
src/index.tsx               createRoot, ConfigProvider (es_ES + tema.ts), <App>, Sentry (solo con VITE_SENTRY_DSN)
src/tema.ts                 tokens del tema claro de antd 6 (colores, fuente Mukta, radios) y configuracionTag
```

**La plantilla Clean UI ya no existe**: layout, menú, `ACL`, login y páginas de error son antd puro en `src/app/`;
no hay Bootstrap, Sass, LESS ni fuentes de iconos (solo `@ant-design/icons`). Estilos: tokens de `src/tema.ts`, `style`
puntual o CSS Modules.

## Convenciones

- **Todo en TypeScript estricto** (`allowJs: false`): sin `any`; `unknown` + comprobaciones; `// @ts-expect-error` solo
  con comentario y hallazgo anotado.
- Importaciones absolutas desde `src` (`tsconfig.json` `baseUrl`, `vite-tsconfig-paths`): `services/axios/grupos`,
  `app/auth/ACL`. No crees archivos en la raíz de `src` con nombre de paquete npm: la resolución
  por `baseUrl` los confundiría.
- Estado global con Zustand: en componentes `useUsuarioStore(estado => estado.permisos)`; fuera de ellos
  `useUsuarioStore.getState()`. Navegación con `useNavigate()` (o `router.navigate()` desde `router.tsx`), todo
  importado de `'react-router'` (no existe `react-router-dom`). Título de página: `<Titulo texto="…" />`.
- Token y localStorage solo vía `helpers/storage.ts`; URLs de archivos que carga el navegador con `conToken(url)`.
- Variables de entorno con `import.meta.env.VITE_*` (tipadas en `src/vite-env.d.ts`); nada de `process.env`
  ni `global` (Vite no los inyecta en el navegador).
- Fechas con **dayjs** (`import dayjs from 'dayjs'`; plugins y locale `es-mx` en `helpers/fechas.ts`). Los
  `DatePicker` reciben y devuelven objetos dayjs.
- `notification`/`message` se importan de `helpers/feedback` (no de `'antd'`): usan el contexto de `<App>`.
- API de antd 6 sin lo obsoleto: `items` en `Menu`/`Dropdown menu`/`Tabs`/`Collapse`/`Steps`/`Descriptions`, `open` en
  `Modal`/`Drawer`, `title` (no `message`) en `notification`, `orientation` en `Space`/`Divider`, `components/ui/Comentario` en vez de `Comment`. El objetivo es 0 avisos en la consola de `dev`.
- Cada página = `index.tsx` + carpeta `componentes/` (`forma*.tsx`, `tabla*.tsx`, `columnas*.tsx`). Secciones con
  `<Tarjeta title>` y títulos con `<Encabezado extra>` (`components/ui`).
- `Select`: opciones con `mapeoOpciones`, búsqueda con `filterOption={filtrarOpcion}` y, con `labelInValue`, el id
  se lee con `idDeEtiquetado` (antd 5+ devuelve `{ value, label }`, sin `key`: F37).
- Depuración con `log` de `helpers/log` (no `console.*`).
- Permisos: envuelve páginas y acciones con `<ACL roles={['CODIGO-ROL']} redirect>` (`app/auth/ACL`); los códigos son
  los `codigoRol` del API (`app/menu/menuItems.ts` tiene la lista por entrada de menú).
- Llamadas al API **solo** vía `services/axios/<recurso>` (que extienden `PeticionBase`); no uses `axios`/`fetch` directo.
  Si el API falla, el interceptor muestra la notificación y **rechaza** la promesa (F1 corregido): maneja el
  error con `.catch(() => {})` o `try/catch/finally` (apaga spinners en `finally`; éxito solo dentro del `try`).
- Tablas server-side: antd `Table` + `PeticionBase.listado(endpoint, { sortField, sortOrder, pagination, filters })`.
- Formularios con `Form.useForm`. Pruebas de componentes con `renderizar()` de `src/test/renderizar.tsx` (mismo `ConfigProvider`).
- Estilo: Prettier 3 (`.prettierrc.json`: sin punto y coma, comillas simples, 100 columnas, LF) y ESLint 10
  (`eslint.config.js`: typescript-eslint, @eslint-react, react-hooks).

## Variables de entorno

`VITE_API_URL` (por defecto `/api/`), `VITE_SENTRY_DSN` (fase 3), `VITE_NOTIFICACIONES` (la campana solo aparece con `on`; el API tiene `/notifications` desde v2.83: SSE con sondeo cada 60 s de respaldo, D14).

## Qué no hacer

- No actualices `antd`, `react` o `react-router` de forma aislada: sigue el orden de fases del plan 01
  (fases 0-6 ✅; queda la 7: pruebas e2e, CI y cobertura).
- Decisiones ya tomadas (`docs/decisiones.md`): Vite + npm, Zustand (no redux ni RTK), TypeScript a la par,
  solo tema claro, sin MagicBell (notificaciones propias), sin `api.ipify.org` (la IP la toma el API).
