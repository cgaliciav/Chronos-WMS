# front/ · guía para agentes

SPA del almacén. **React 16.13 · antd 4.2 · redux + redux-saga · react-router-dom 5 (hash) ·
Create React App 3.4 + react-app-rewired · Node 10.24 · Yarn 1 · JavaScript (sin TypeScript)**.
Construida sobre la plantilla comercial **Clean UI Admin Template**; el plan
`docs/planes/01-front-actualizacion-antd.md` describe cómo retirarla y actualizar todo el stack.
Arquitectura detallada: `docs/front/arquitectura.md`. Fallos conocidos: `docs/hallazgos-codigo.md` (sección B).

Scripts: `yarn start` (dev, proxy `/api` **no** configurado: usa `REACT_APP_API_URL`), `yarn build`,
`yarn eslint`, `yarn prettier`. **No hay pruebas automatizadas.**

## Dónde está el código de negocio (≈ 17 k LOC)

```
src/pages/administracion/   usuarios, proyectos, proveedores, areas, bodegas, parametros
src/pages/catalogos/        búsquedas (general, por códigos, bajas, por proyecto, por facturas, validaciones, inventario visual), articulos/
src/pages/operaciones/      1.prestamos 2.devoluciones 3.bajas 4.compras 5.altas 6.rentaExterna 8.previo movimiento/ componentes/
src/pages/reportes/         por-usuario, de-cierre
src/pages/componentes/      modales/formularios compartidos (precios, claves, características, archivos, comentarios, imágenes)
src/pages/auth/             login, 401, 404, 500, 503
src/layouts/                Public / Auth / Main (Main usa componentes de cleanui)
src/redux/                  user (login/currentAccount/logout), menu (menuData), settings (tema/layout de la plantilla)
src/services/axios/         apiClient + PeticionBase + 20 clases por recurso (grupos, usuarios, inventarioActual, movimientos…)
src/services/menu/index.js  menú estático con `role` por entrada
src/router.js               64 rutas (React.lazy); guarda localStorage.ultimaVisitada
```

**Todo lo demás es plantilla**: `src/components/{kit,kit-*,cui-*}` y `src/pages/{advanced,apps,cards,charts,dashboard,ecommerce,icons,tables,ui-kits,widgets}`
no se usan en negocio (solo la demo `/dashboard/alpha`). `src/components/cleanui/{layout,system}` sí está en
uso (layout, `ACL`, `Login`, páginas de error). No añadas código nuevo dentro de `components/cleanui` ni `kit*`.

## Convenciones

- Importaciones absolutas desde `src` (`jsconfig.json` `baseUrl`): `services/axios/grupos`, `components/cleanui/system/ACL`, `redux/...`.
  `import { history, store } from 'index'` es una importación circular heredada: evita añadir más usos.
- Cada página = `index.js` + carpeta `componentes/` (`forma*.js`, `tabla*.js`, `columnas*.js`).
- Permisos: envuelve páginas y acciones con `<ACL roles={['CODIGO-ROL']} redirect>`; los códigos son los
  `codigoRol` del API (`services/menu/index.js` tiene la lista por entrada de menú).
- Llamadas al API **solo** vía `services/axios/<recurso>` (que extienden `PeticionBase`); no uses `axios`/`fetch` directo.
  Ojo: el interceptor de error **devuelve** el error en vez de rechazarlo (hallazgo F1): comprueba
  `resp instanceof Error`/`resp.response` hasta que se corrija.
- Tablas server-side: antd `Table` + `PeticionBase.listado(endpoint, { sortField, sortOrder, pagination, filters })`.
- Formularios con `Form.useForm` (API antd 4). Fechas con `moment` (se migrará a `dayjs`).
- Estilo: prettier (sin punto y coma, comillas simples, 100 columnas), ESLint airbnb.
- No introduzcas más dependencias de la plantilla (bootstrap, reactstrap, `kit__*`/`cui__*` clases) en páginas nuevas:
  usa componentes antd (`Card`, `Space`, `Typography`).

## Variables de entorno

`REACT_APP_API_URL` (por defecto `/api/`), `REACT_APP_MAGICBELL_API_KEY`, `REACT_APP_MAGICBELL_USER_KEY`.

## Qué no hacer

- No actualices `antd`, `react` o `react-router` de forma aislada: sigue el orden de fases del plan 01
  (CRA→Vite+TypeScript primero, luego React 19/Router 8/Zustand, luego antd 5 → 6, luego retirar Clean UI).
- Decisiones ya tomadas (`docs/decisiones.md`): Vite + npm, Zustand (no redux ni RTK), TypeScript a la par,
  solo tema claro, sin MagicBell (notificaciones propias), sin `api.ipify.org` (la IP la toma el API).
- No borres `components/cleanui/system/ACL` sin su reemplazo (`app/auth/ACL`, plan 01 fase 6): lo importan 76 archivos.
