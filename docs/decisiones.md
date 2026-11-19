# Decisiones del propietario (2026-11-07)

Respuestas de César Galicia a las dudas planteadas tras la auditoría. Son vinculantes para los planes
`docs/planes/01-*.md` y `02-*.md`; quien los ejecute no debe reabrirlas.

| # | Tema | Decisión | Aplicación |
|---|---|---|---|
| 1 | Tooling front | **Vite** y **npm** (dejar Yarn 1 y CRA). | Plan 01 D1, D3, fase 2 |
| 2 | Estado front | **Zustand** (sustituye redux + redux-saga + connected-react-router). | Plan 01 D6, fase 3 |
| 3a | Tema oscuro | **No requerido**: solo tema claro; se elimina el toggle y el store de tema. | Plan 01 D10 |
| 3b | MagicBell | **Se elimina.** Se desarrollará un **sistema de notificaciones propio** (API + campana en el front). | Plan 02 fase 7; plan 01 D14 |
| 3c | IP del cliente | **Sí se necesita**, pero obtenida **en el API** (`req.ip` con `trust proxy`), no vía `api.ipify.org` desde el navegador. | Plan 02 fase 2 paso 4; plan 01 D15 |
| 4 | TypeScript | **Migrar a la par** del resto del plan del front. | Plan 01 D13, fases 2, 3 y 6 |
| 5 | Relación entre movimientos | **Una devolución puede cubrir varios préstamos** → relación **N:M** (`movimiento_relacion` con cantidad por par). | Plan 02 §2.1 |
| 6 | Backfill | **Solo movimientos nuevos**; no se relacionan los históricos. Respaldo de BD disponible más adelante. | Plan 02 regla 8 (modo de compatibilidad) |
| 7a | Sentry | **Dejar preparado** (API y front), activo solo si hay DSN. | Plan 02 fase 2 paso 11; plan 01 D16 |
| 7b | Supabase | **Se quita** (código y dependencia). | Plan 02 fases 3 y 4 |
| 8 | Comportamientos dudosos (`nuevoConInventario` sin filtro de bodega; tipos 15/5 que envía el front) | **Revisar sobre la marcha.** Resuelto con las decisiones 10 y 11. | Plan 02 §7 |
| 9 | API de pruebas para e2e | **No existe.** Los e2e del front usan MSW; el `docker-compose.test.yml` del plan 02 fase 0 será la primera API de pruebas. | Plan 01 D18; plan 02 fase 0 |
| 10 | Inventario físico por grupos (`POST /groups/new-inventory` y afines) | **Se elimina** (2026-11-08): nunca se terminó ni se usó. Se conserva la tabla `inventario_detalle` por los datos existentes. | Plan 02 §7; `api/endpoints.md` |
| 11 | Tipo de los listados | Un listado es **del tipo de movimiento que contiene** y todas sus líneas son de ese tipo. Los listados de bajas son de BAJA JUSTIFICADA (13) o INJUSTIFICADA (16); el tipo legado 5 ya no se usa (los listados antiguos de tipo 5 siguen admitiendo 13 y 16). | `api/endpoints.md`; front `3.bajas` |
| 12 | Tipos 6, 9 y 10 | Un inventario o un ajuste **no es un movimiento**: el API los rechaza como operación y como tipo de listado. | `api/tipos-de-movimiento.md` |
| 13 | Depreciación de precios | **No se implementa**: solo se usa el precio original (tipo 2). Los artículos nuevos solo guardan ese precio. | Hallazgo M5 |
| 14 | Duración de la sesión | **Se mantiene** el token de 12 h que se renueva en cada petición (caduca tras 12 h sin uso o al cerrar sesión). | Plan 02 §7 |
| 15 | Rutas del front | **Sin `#`** (`createBrowserRouter`), revisa D5 del plan 01 (2026-11-10). El contenedor del front sirve `front/nginx.conf` con fallback a `index.html`. | Front v4.1.0; `docs/front/arquitectura.md` |
| 16 | Personalización por cliente | **El API sirve la marca** y la configuración (correo, logo de reportes), editables desde el front; un solo código y build para todos, **sin ramas por cliente**; "Sony"/"Teleset" pasan a **"Chronos WMS"** como valor por defecto (2026-11-10). | Plan 03 §2 |
| 17 | Caddy en Docker e imágenes | **Caddy dentro de Docker** como único proxy (certificados por reto DNS) sustituye a los dos nginx en los clientes nuevos; imágenes `chronos-web` y `chronos-api` **construidas una vez en la máquina del propietario**, publicadas en Docker Hub (privado) como `X.Y.Z-s` y **promovidas a producción con la misma etiqueta `X.Y.Z` y el mismo digest**, sin reconstruir. AMZ (Linode nuevo) es el primer cliente; la migración de Sony a este esquema va aparte (2026-11-10). | `docs/superpowers/specs/2026-11-10-caddy-docker-amz-design.md`; `docs/infra/procedimiento-alta-amz.md` |
| 18 | Expendables | Un expendable es un producto de tipo **CONSUMIBLE** (`producto_tipo` 2). Al prestarlo **se da por consumido**: bajan la existencia disponible y la total, **sin pendiente de devolución**. Si se devuelve, suben ambas. Una COMPRA de expendable queda a nombre de la producción sin sumar existencias ni pendiente; el ALTA sí suma (2026-11-17). | Plan 04 bloque A |
| 19 | Cantidades y bajas | Préstamo, devolución y **bajas por cantidad**: la baja descuenta solo las unidades indicadas y el producto queda en `baja` al llegar a cero (2026-11-17). | Plan 04 bloque A |
| 20 | Transformación | Un producto se transforma **siempre con la producción**: se descuenta de su pendiente la cantidad usada (puede ser parcial) y se crean uno o más productos nuevos, con su código, ligados al original y a cargo de esa producción (2026-11-17). | Plan 04 bloque C |
| 21 | Visibilidad exclusiva | Opción **por usuario**: `general`, `produccion` (ve lo comprado o creado por transformación por sus proyectos, o cuyo último movimiento es de ellos) o `usuario` (ve los productos en cuyos movimientos es responsable o quien registró). Lo que no ve tampoco lo opera. El rol **ADMINISTRADOR ignora el modo** (2026-11-17). | Plan 04 bloque B |
| 22 | Perfiles de usuario | Los permisos se asignan con un **perfil**, no con roles sueltos: **Superadministrador** (todo), **Administrador** (todo menos la Configuración), **Encargado de Producción** (búsqueda por proyecto, compras completas y reportes, y los listados de préstamos activos y por proyecto de préstamos, devoluciones y bajas con proyecto, sin registrarlos) y **Visita** (solo el listado de préstamos activos). El formulario muestra solo el perfil. Quien tenía el rol ADMINISTRADOR pasa a Superadministrador; el resto conserva sus roles como `personalizado` hasta que se le asigne un perfil (2026-11-19). | `api/src/services/perfiles.ts`; API v2.93.0, front v4.14.0 |
| 23 | Usuarios sin correo | Casilla **Sin correo**: usuarios que solo existen para asignarlos como responsables (préstamos, devoluciones…). El sistema les inventa un correo `nombre@fake.exogrid.io`; **nunca entran al sistema ni reciben correos o reportes** (2026-11-19). | Perfil `sin-acceso`; API v2.93.0, front v4.14.0 |
| 24 | Nombre de los listados | El nombre de un listado se puede **editar**, solo por Administradores y Superadministradores (2026-11-19). | `PUT /groups/rename`; API v2.94.0, front v4.15.0 |
| 25 | Mover movimientos entre listados | Un movimiento se puede **mover a otro listado del mismo tipo** (préstamo con préstamo, compra con compra…), **uno por uno**, eligiendo en una ventana un listado que ya exista. Puede cambiar de proyecto y de responsable: toma los del listado destino (2026-11-19). | `PUT /groups/activity-move`; API v2.94.0, front v4.15.0 |
| 26 | Productos por proveedor | Página en Proveedores que lista los productos comprados a un proveedor, con **proyecto opcional**. En las búsquedas, el detalle del artículo se abre en una ventana al 80 % del área visible (2026-11-19). | `POST /groups/list-by-supplier-antd`; front v4.15.0 |
