# front/ · guía para agentes

SPA del almacén. **React 16.14 · antd 4.24 · redux + redux-saga · react-router-dom 5 (hash) ·
Vite 8 · TypeScript 5.9 (`allowJs`, código heredado en `.js/.jsx`) · Node 24 · npm**.
Construida sobre la plantilla comercial **Clean UI Admin Template**; el plan
`docs/planes/01-front-actualizacion-antd.md` describe cómo retirarla y actualizar todo el stack.
Arquitectura detallada: `docs/front/arquitectura.md`. Fallos conocidos: `docs/hallazgos-codigo.md` (sección B).
**Estado del plan 01:** fases 0, 1 y 2 hechas (línea base, borrado de la plantilla muerta, CRA → Vite + TypeScript).
Rutas, roles y endpoints: `docs/front/inventario-rutas.md`; verificación manual: `docs/front/checklist-humo.md`.

Scripts (Node 24, `nvm use`): `npm run dev` (puerto 3000, proxy `/api` → `http://localhost:4100`),
`npm run build` (`tsc -b` + `vite build` a `build/`), `npm run preview`, `npm run lint` (ESLint 10, 0 errores
obligatorio; los avisos del código heredado se toleran), `npm run typecheck`, `npm test` (Vitest; aún sin
pruebas, llegan en la fase 3), `npm run format`. Tras cada cambio visible pasa el checklist de humo y, si tocas
estilos o layout, compara capturas con `docs/front/baseline/capturar.js` (acepta `build/` o la URL de `dev`/`preview`).

## Dónde está el código de negocio (≈ 17 k LOC)

```
src/pages/administracion/   usuarios, proyectos, proveedores, areas, bodegas
src/pages/catalogos/        búsquedas (general, por códigos, bajas, por proyecto, por facturas, validaciones, inventario visual), articulos/
src/pages/operaciones/      1.prestamos 2.devoluciones 3.bajas 4.compras 5.altas 6.rentaExterna 7.inventario 8.previo movimiento/ componentes/
src/pages/reportes/         por-usuario, de-cierre
src/pages/componentes/      modales/formularios compartidos (precios, claves, características, archivos, comentarios, imágenes)
src/pages/auth/             login, 401, 404, 500, 503
src/layouts/                Public / Auth / Main (Main usa componentes de cleanui)
src/redux/                  user (login/currentAccount/logout), menu (menuData), settings (tema/layout de la plantilla)
src/redux/{store,history}.js store y historial (antes exportados desde index.js)
src/services/axios/         apiClient + PeticionBase + 20 clases por recurso (grupos, usuarios, inventarioActual, movimientos…)
src/services/menu/index.js  menú estático con `role` por entrada
src/router.jsx              67 rutas (React.lazy); guarda localStorage.ultimaVisitada
```

**Lo que queda de la plantilla está en uso** (las demos se borraron en la fase 1 del plan 01):
`src/components/cleanui/{layout,system}` (layout, `ACL`, `Login`, páginas de error) y los estilos globales que
importa `global.scss`: `components/{kit-core,kit-vendors,cui-styles}` y `components/kit/core/mixins.scss`. El tema
de antd está en `src/styles/antd.less`, dentro de `[data-kit-theme='default']` (atributo fijo en `index.html`) para
conservar la cascada de CRA; `vite.config.ts` lleva el plugin PostCSS que limpia ese ámbito. No añadas código
nuevo en la plantilla; todo esto se retira en las fases 4-6.

## Convenciones

- **Código nuevo siempre en `.ts/.tsx`** (plan 01 D13). Los `.js/.jsx` heredados no se verifican (`checkJs: false`).
  Un archivo con JSX debe ser `.jsx`/`.tsx` (Vite no transforma JSX en `.js`).
- Importaciones absolutas desde `src` (`tsconfig.json` `baseUrl`, `vite-tsconfig-paths`): `services/axios/grupos`,
  `components/cleanui/system/ACL`. No crees archivos en la raíz de `src` con nombre de paquete npm (`store`,
  `history`, `redux`…): la resolución por `baseUrl` los confundiría. Store e historial: `redux/store`, `redux/history`.
- Variables de entorno con `import.meta.env.VITE_*` (tipadas en `src/vite-env.d.ts`); nada de `process.env`
  ni `global` (Vite no los inyecta en el navegador). `moment` se importa por defecto (`import moment from 'moment'`).
- Cada página = `index.jsx` + carpeta `componentes/` (`forma*.jsx`, `tabla*.jsx`, `columnas*.jsx`).
- Permisos: envuelve páginas y acciones con `<ACL roles={['CODIGO-ROL']} redirect>`; los códigos son los
  `codigoRol` del API (`services/menu/index.js` tiene la lista por entrada de menú).
- Llamadas al API **solo** vía `services/axios/<recurso>` (que extienden `PeticionBase`); no uses `axios`/`fetch` directo.
  Ojo: el interceptor de error **devuelve** el error en vez de rechazarlo (hallazgo F1): comprueba
  `resp instanceof Error`/`resp.response` hasta que se corrija.
- Tablas server-side: antd `Table` + `PeticionBase.listado(endpoint, { sortField, sortOrder, pagination, filters })`.
- Formularios con `Form.useForm` (API antd 4). Fechas con `moment` (se migrará a `dayjs`).
- Estilo: Prettier 3 (`.prettierrc.json`: sin punto y coma, comillas simples, 100 columnas) y ESLint 10
  (`eslint.config.js`: typescript-eslint, @eslint-react, react-hooks). Respeta el fin de línea de cada archivo (hay CRLF heredados).
- No introduzcas más dependencias de la plantilla (bootstrap, reactstrap, `kit__*`/`cui__*` clases) en páginas nuevas:
  usa componentes antd (`Card`, `Space`, `Typography`).

## Variables de entorno

`VITE_API_URL` (por defecto `/api/`), `VITE_SENTRY_DSN` (fase 3), `VITE_NOTIFICACIONES` (`off` hasta el sistema propio, D14).

## Qué no hacer

- No actualices `antd`, `react` o `react-router` de forma aislada: sigue el orden de fases del plan 01
  (CRA→Vite+TypeScript ✅, luego React 19/Router 8/Zustand, luego antd 5 → 6, luego retirar Clean UI).
- No quites `data-kit-theme="default"` de `index.html` ni el envoltorio de `src/styles/antd.less` antes de la fase 4:
  sin ellos `kit-vendors` se impone a antd en todos los componentes.
- Decisiones ya tomadas (`docs/decisiones.md`): Vite + npm, Zustand (no redux ni RTK), TypeScript a la par,
  solo tema claro, sin MagicBell (notificaciones propias), sin `api.ipify.org` (la IP la toma el API).
- No borres `components/cleanui/system/ACL` sin su reemplazo (`app/auth/ACL`, plan 01 fase 6): lo importan 76 archivos.
