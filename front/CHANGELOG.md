# Changelog · Front

Cambios notables del front de Chronos-WMS. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y la numeración, las reglas de versionado del [`CLAUDE.md` raíz](../CLAUDE.md): `vX.Y.Z`; **mayor** para cambios
drásticos de objetivo, lenguaje o stack; **menor** para capacidades, pautas o herramientas nuevas; **parche** para
correcciones y aclaraciones; sufijo `-d` en desarrollo y `-s` en staging.

La versión vive en `package.json` (la usa Sentry como `release`, `chronos-wms-front@<versión>`).
`deploy-production.sh` sube el **parche** en cada despliegue a producción (`npm version patch`) y crea el tag
`v<versión>`.
Los códigos `F<n>` remiten a [`docs/hallazgos-codigo.md`](../docs/hallazgos-codigo.md) y los `D<n>` a las decisiones del
[plan 01](../docs/planes/01-front-actualizacion-antd.md).

## [Sin publicar]

Pendiente: fase 7 del plan 01 (pruebas e2e con Playwright, CI y cobertura).

## [4.9.0-d] - 2026-11-10

Sentry con el entorno y el cliente leídos en tiempo de ejecución.

### Añadido

- **`/entorno.json`** (`src/entorno.ts`): el front lo pide al arrancar (`cache: 'no-store'`, 2 s de límite; ante error
  devuelve `{}`) y Sentry usa `entorno` como `environment` y `cliente` como etiqueta. Sin el archivo, `environment` es
  el modo de Vite y no hay etiqueta. Lo servirá Caddy; un mismo build sirve a varios despliegues.

### Cambiado

- `iniciarSentry(entorno)` recibe el entorno; se inicia sin bloquear el primer render.

## [4.8.0-d] - 2026-11-10

Aviso de versión nueva: el front detecta que hay un despliegue nuevo y avisa (PWA).

### Añadido

- **Service worker (PWA)** con `vite-plugin-pwa` 2.0, solo en el build:
  - precachea el front, nunca el API;
  - la pestaña abierta sigue funcionando aunque el despliegue borre los chunks viejos;
  - la app se puede instalar.
- **Aviso "Hay una versión nueva"** (`app/actualizacion`):
  - revisa cada 5 min y al volver a la pestaña;
  - botón **Actualizar**;
  - si el usuario lo ignora, la versión nueva se aplica en el siguiente cambio de página, para no perder un
    formulario a medias.
- **Recarga única si falla la carga de un chunk** (`vite:preloadError`): cubre a los navegadores que aún no tienen el
  service worker.
- Iconos de 192 y 512 px (también maskable) y `apple-touch-icon`, generados desde `resources/images/logo.svg`.

### Cambiado

- El botón **Actualizar** del login (`helpers/limpiarCache`) ahora pide al service worker la versión nueva y la activa.
  Conserva la precache de workbox y borra el resto de Cache Storage antes de recargar.
- `public/manifest.json` se sustituye por el `manifest.webmanifest` que genera el plugin, con el mismo nombre y
  colores.
- El servidor debe servir `/sw.js` y `/manifest.webmanifest` con `Cache-Control: no-cache`. Queda pendiente para el
  Caddy que sustituirá al doble nginx.

## [4.7.1-d] - 2026-11-10

Ajustes de estilo: interfaz más compacta y tablas y cuadrículas más legibles.

### Cambiado

- **Espaciado a la mitad en toda la app:** `sizeUnit: 2` en `tema.ts` (antd deriva de él todos los márgenes y rellenos;
  la altura de los controles no cambia), cabecera de 48 px, y rellenos del layout, `Tarjeta`, `Encabezado`, `Comentario`,
  login y los `gutter` y márgenes fijos de las páginas a la mitad.
- **Menú lateral:** 34 px por elemento (antes 44).
- **Título de las tablas:** nuevo `components/ui/EncabezadoTabla` (título, total y acciones en una fila, sin los márgenes
  de `h2`/`h3`) en los listados por grupo, las operaciones, los listados por proyecto y administración. El menú
  "Reportes" va junto al total, en vez de flotar con un margen negativo.
- **Filas alternas** en todas las tablas, con el fondo claro del color principal de la marca
  (`--ant-color-primary-bg`, plan 03): `src/estilos-globales.css`, que respeta el hover, las filas seleccionadas y la
  columna ordenada.
- **Cuadrícula de resultados uniforme** (catálogos y validaciones): imagen cuadrada sin recortar
  (`ImagenesEnCarrusel cuadrada`), descripción de dos líneas con el texto completo en un tooltip, último movimiento en
  una línea, línea de cuarentena reservada y tarjetas que llenan la columna. Todas miden lo mismo.

### Corregido

- `docs/front/baseline/capturar.js`: simula `/notifications` y navega sin `#` (las capturas salían con la página de
  error 500).

## [4.7.0-d] - 2026-11-10

Plan 03, fase 5.

### Añadido

- `/configuracion`: botones **Exportar** (descarga el JSON sin secretos) e **Importar** (aplica uno y recarga la marca y
  las pestañas).

## [4.6.0-d] - 2026-11-10

Plan 03, fase 4: pantalla de configuración.

### Añadido

- `/configuracion` (menú de Administración, `ADMINISTRADOR` o `CONFIGURACION-EDITAR`) con pestañas Marca, Correo,
  Reportes y Regional: nombre, textos, soporte, crédito, colores (selector), fuente, logo y favicon con vista previa;
  servidor SMTP con contraseña solo de escritura, remitente, plantillas con la lista de variables y "Enviar correo de
  prueba"; logo de los reportes; monedas, idioma y zona horaria. Si otra persona guardó antes se avisa y se recarga;
  los campos que el API rechaza se marcan en el formulario.

## [4.5.0-d] - 2026-11-10

Plan 03, fase 3: la marca del cliente llega del API (`GET /config/public`, API v2.86+).

### Añadido

- Nombre, logo, favicon, colores, fuente, textos del login, soporte y crédito del pie salen de la configuración del
  cliente, sin rebuild: basta recargar. Con el API caído se usa la marca de Chronos WMS y se reintenta al navegar.
- Moneda por defecto, lista de monedas y formato de importes desde la configuración regional.

## [4.4.0-d] - 2026-11-10

Plan 03, fase 0: identidad por defecto "Chronos WMS" (no desplegar a producción hasta la fase 5).

### Cambiado

- Nombre, títulos de pestaña, bienvenida, textos del login y pie de página salen de `app/marca.ts`
  (`MARCA_POR_DEFECTO`, "Chronos WMS"); el soporte del pie pasa a `soporte@exogrid.io`.
- `index.html` y `manifest.json` neutros (el manifest era de la plantilla Air UI).
- `sinMarcaDeCliente.test.ts` falla si aparece el nombre de un cliente en `src/`, `index.html` o `public/`.

## [4.3.0-d] - 2026-11-10

Contraseña temporal con cambio obligatorio (hallazgo L2; necesita el API v2.84 con su migración).

### Añadido

- Quien entra con la contraseña temporal que le llegó por correo va a `/auth/cambiar-password` y no ve otra página hasta
  elegir la suya (también al recargar: `GET /user/current` lo indica). Al guardarla, el API entrega el token normal.
- Las reglas de la contraseña nueva se comparten con la pantalla de "Cambiar password" (`helpers/reglasPassword.ts`).

## [4.2.2-d] - 2026-11-10

### Corregido

- Las miniaturas de los listados de movimientos y la subida de archivos piden la URL del API con una sola barra
  (`urlDelApi()`; antes `/api//file/…`, que el API con Express 5 respondía con 404, hallazgo M39).

## [4.2.1-d] - 2026-11-10

### Cambiado

- Campana de notificaciones más compacta (unos 50 % menos de alto por elemento): menos relleno, título a 13 px, mensaje a
  12 px en dos líneas como máximo (completo en un tooltip) y la fecha relativa a 11 px junto al título (fecha exacta al
  pasar el cursor).
- Las no leídas se distinguen claramente: fondo azul claro, punto azul y título en negrita; las leídas, sin fondo y con
  el texto atenuado (antes solo cambiaba la opacidad).

### Corregido

- El contador de la campana muestra el total de no leídas del API (`GET /notifications/count` al cargar y el evento
  `conteo` del SSE, que también refleja lo marcado en otra pestaña). Antes contaba solo las 50 cargadas en la lista, así
  que nunca pasaba de 50.

## [4.2.0-d] - 2026-11-10

Notificaciones del API (plan 02 fase 7, D14). Para activarlas: `VITE_NOTIFICACIONES=on` cuando el API v2.83 esté
desplegado con su migración.

### Añadido

- La campana recibe las notificaciones nuevas al momento por Server-Sent Events (`/notifications/stream`) y, si el
  canal no está disponible o se cierra, vuelve a pedir la lista cada 60 s.
- "Marcar todas como leídas" (`PUT /notifications/read-all`).
- Las notificaciones de reportes abren la descarga del API en otra pestaña con el token (`/file/report/…?auth=`); las
  demás siguen navegando a su ruta del front.

## [4.1.0-d] - 2026-11-10

### Cambios que rompen

- **Rutas sin `#`**: `createBrowserRouter` en lugar de `createHashRouter` (`/catalogo/general`, antes
  `/#/catalogo/general`; revisa D5). El servidor debe devolver `index.html` en cualquier ruta: **antes de desplegar**,
  montar [`nginx.conf`](nginx.conf) en el contenedor `frontend` (pasos en `docs/front/arquitectura.md`, sección
  Despliegue). `deploy.sh` y `deploy-production.sh` se detienen si el servidor aún no lo tiene. Staging lo aplica solo.

### Cambiado

- Los enlaces antiguos con `#/` (marcadores, historial) se convierten a la ruta nueva al cargar
  (`helpers/enlacesHash.ts`, con prueba).
- Los enlaces de las tablas (editar, operación, detalle) usan `<Link>` del router: navegan sin recargar la página.
- Imágenes de `public/resources` con ruta absoluta (`/resources/…`) para que carguen en rutas anidadas.

## [4.0.1-d] - 2026-11-10

### Corregido

- **Catálogo por proyecto** (`/catalogo/por-proyecto`): la búsqueda fallaba con «movimientosTipoIds debe ser un
  arreglo». El `Select` de operación es simple y enviaba un id suelto; desde la fase 2 del plan 02 el API exige un
  arreglo. Ahora se envía `[id]` (`4.porProyecto/parametros.ts`, con prueba).
- Catálogo por proyecto: al cambiar de página o de tamaño de página no se enviaba la operación y el API devolvía la
  tabla vacía; las tres llamadas usan ahora los mismos parámetros.
- `npm run dev`: el proxy de Vite quita el prefijo `/api`, igual que el nginx de producción (antes todas las llamadas
  daban 404 en desarrollo).

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
  `react-router-dom` 5 → **`react-router` 8** con `createHashRouter` y rutas _lazy_ (se mantiene el _hash routing_).
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
