# Catálogo de endpoints del API

Montaje: `app.use("/", routes)` en `src/index.ts`; en producción el front llama con prefijo `/api/`
(proxy inverso). Autenticación: cabecera `auth: <jwt>` verificada por `checkJwt`
(`src/middlewares/verificarJwt.ts`); autorización por `checkRole([...codigos])`
(`src/middlewares/verificarRol.ts`), que además deja en `res.locals` las áreas, bodegas y proyectos
del usuario. `ADMIN` = `ADMINISTRADOR` (siempre incluido salvo que se indique). **jwt** = solo
`checkJwt`. **—** = sin autenticación.

**Cambios de la fase 2 del plan 02 (coordinar con el front):**
- `GET /file/*` exigen token: cabecera `auth` **o** parámetro `?auth=<jwt>` (para `<img src>`). Con la variable
  `ARCHIVOS_PUBLICOS=true` siguen públicos durante la transición. El front debe añadir `?auth=` a las URLs de
  imágenes/miniaturas/reportes (plan 01, fase 3).
- `POST /auth/login` ignora `ip` del body; la IP de la sesión es la de la conexión (`TRUST_PROXY`). Hay límite de
  intentos por IP (`LOGIN_MAX_INTENTOS`, 429 al superarlo).
- `PUT /user/renewpassword` responde `{ correo, enviado: true }` y envía la contraseña por correo (ya no la devuelve).
- `PUT /groups/activity`, `/activity-purchase`, `/activity-add-transaction`, `DELETE /groups/activity`,
  `POST /user/new`, `PUT /user/edit`, `PUT /current-inventory/edit` validan el cuerpo con zod: campos
  desconocidos se descartan y los inválidos responden `400 { message: "Error de validación en: campo, …" }`.
- `PUT /current-inventory/edit` solo acepta `bodegaId` y `fechaDisponibilidad`.
- Los `sortField` y las llaves de `filters` deben ser identificadores (`columna` o `alias.columna`); otra cosa → 400.
- Handlers sin implementar (`/reports/by-use`, `/by-group-detail`, `/by-invoice`, `/by-inventory`,
  `/current-inventory/list-catalog-invoices`) responden `501`.
- Token sin firma válida o ausente → `401`; registro inexistente → `404 REGISTRO NO ENCONTRADO`.
- Las columnas `numeric` (`cantidad`, `cantidadAlmacen`, precios, totales) llegan como **número** en el JSON (antes string `"5.0000"`).

**Cambios de la fase 3 del plan 02 (coordinar con el front, plan 01):** todos son compatibles hacia atrás salvo
los marcados con ⚠.
- `PUT /groups/activity` y `PUT /groups/activity-add-transaction` aceptan dos campos opcionales:
  - `relaciones: [{ origenId, cantidad }]`: a qué salidas (préstamo 3, renta 11, transferencia destino 12 o compra 15
    del mismo artículo y proyecto) se aplica una devolución (4), transferencia origen (7) o baja (5/13/16); para un 12,
    a qué transferencia origen (7). La suma debe ser igual a `cantidad` y cada `cantidad ≤ saldo` del origen; si no → 400.
  - `strict: true`: si no se envían `relaciones` y hay más de una salida candidata responde
    `409 { code, message, candidatas: [{ movimientoId, movimientoTipoId, proyectoId, fecha, cantidad, saldo }] }`.
  - Sin estos campos (front actual) el API reparte por **FIFO** (la salida más antigua primero).
  - Movimientos anteriores a la fase 3 (`legado`): si no hay salidas nuevas que cubran la cantidad, se acepta contra
    el saldo calculado con la heurística anterior y se registra un aviso en `LogGeneral` (modo de compatibilidad).
- ⚠ Una devolución o baja en un proyecto distinto al de la salida responde **400** (antes 401) con el mismo mensaje
  ("El movimiento no pertenece al proyecto seleccionado …"). Una cantidad mayor que el saldo pendiente del proyecto → 400.
- ⚠ `DELETE /groups/activity`: `409 { derivados: [{ movimientoId, cantidad, tipo }] }` si el movimiento es origen de
  otros (deshaga primero los derivados); `409` si después hay una compra o baja del mismo artículo, o si es una compra o
  baja que no es el último movimiento. Ahora se puede deshacer un préstamo o devolución que no sea el último.
- `PUT /groups/activity`, `/activity-purchase` y `/activity-add-transaction` son **transaccionales**: o se guarda todo
  (inventario, histórico, operación, movimiento, relaciones, grupo) o nada. Dos operaciones simultáneas sobre el mismo
  artículo se serializan. `activity-purchase` valida el tipo antes de crear el producto.
- ⚠ `PUT /groups/activity-add-transaction`: 400 si el movimiento ya tiene operación o si el tipo es de alta/compra.
- Respuesta de `PUT /groups/activity*`: el movimiento incluye `fecha`, `legado` y `relacionesComoDerivado: [{ id, origen: { id }, cantidad, tipo, fecha }]`.
- `GET /activity/:id` añade `fecha`, `relacionesComoDerivado`, `relacionesComoOrigen` y `saldoPendiente`
  (`null` si no es una salida o es legado). ⚠ Un id inexistente responde 404 (antes 200 vacío).
- Nuevos: `GET /activity/:id/chain` y `GET /activity/open-by-inventory/:inventarioActualId?proyectoId=` (abajo).
- `POST /groups/active-activity-list`: una fila por **salida abierta** (antes una por producto) con `saldoPendiente`.
- ⚠ `PUT /groups/edit-details`, `/groups/edit-purchase` y `/transaction/edit` responden `409 { movimientos }` si
  cambiarían el proyecto de operaciones que ya tienen relaciones.
- ⚠ Retirados `GET /groups/export-to-supabase/:id` y `GET /current-inventory/export-to-supabase/:id` (el front no los usaba).
- ⚠ `POST /auth/logout` revoca el token: después, ese token responde 401 ("Sesión terminada").

**Cambios de v2.86.0 (plan 03, fase 1):** nuevo recurso `/config` (sección "Configuración"), rol `CONFIGURACION-EDITAR`,
migración `Configuracion`. v2.85.0 (fase 0): correos con "Chronos WMS" en lugar del nombre del cliente.

**Cambios de v2.84.0 (contraseña temporal, hallazgo L2):** requiere la migración `PasswordTemporal`.
- ⚠ La contraseña de alta (`POST /user/new`) y la regenerada (`PUT /user/renewpassword`) son temporales: vencen a las
  `HORAS_PASSWORD_TEMPORAL` horas (72) y hay que cambiarlas al entrar.
- ⚠ `POST /auth/login` con la temporal → `{ t, cambiarPassword: true }`. Con ese token solo valen `PUT /user/password`,
  `GET /user/current` y `POST /auth/logout`; el resto responde **403** `{ code, message, cambiarPassword: true }`. Con
  la temporal vencida, 401.
- `PUT /user/password` `{ pa, pn }` → `{ t }` (token normal, también en la cabecera `t`); 406 si `pn` no es válida o es
  igual a `pa`.
- `GET /user/current` añade `cambiarPassword: true` mientras el cambio está pendiente.

**Cambios de v2.83.3 (hallazgos M14, L19, L12, L3):**
- `filtered` es el conteo filtrado en todos los listados (antes el tamaño de página en `list-catalog-*` y el total sin
  filtrar en `active-activity-list`; el front no lo usa).
- Los listados con joins aceptan `sortField` sin alias o ausente (antes 500).
- ⚠ `GET /` responde `{ estado: "ok" }` y `GET /auth/version` `{ version }` (sin `name`; el front solo lee `version`).

**Cambios de la fase 7 (v2.83.0, notificaciones):**
- Nuevo recurso `/notifications` (sección "Notificaciones"). Requiere la migración `Notificacion`.
- `POST /reports/by-group`, `/by-project` y `/by-project-final` responden igual (`{ message }`, el texto menciona el
  aviso) y al terminar crean una notificación `tipo: "reporte"` con `url: "/file/report/<nombre>"` o, si fallan, con
  el error.
- `GET /file/report/:nombre` busca el nombre tal cual (con espacios y acentos; antes daba 404). Un nombre oculto
  (`.env`) responde 400.

**Cambios de la fase 6 (v2.82.0, TypeORM 1.x):** la forma de las respuestas no cambia (`formaRespuestas.int.test.ts`).
- ⚠ `POST /groups/new-details` con `proyectoId` `null` o ausente crea el listado **sin proyecto** (antes quedaba
  asignado al primer proyecto de la tabla).
- ⚠ Ids ausentes o no numéricos en el cuerpo de `PUT /item/edit`, `/item-code/*`, `/item-spec/*`, `PUT /user/edit`,
  los reportes por proyecto y las altas de artículos/listados responden `400 "<campo> inválido"` (antes cargaban la
  primera fila o respondían 500).

**Cambios de la fase 5 (v2.81.0, Express 5):** compatibles salvo lo marcado.
- `POST /groups/create-list-from-report-use` y `/create-list-from-report-activity` responden `501` (antes la petición
  se quedaba colgada). `POST /current-inventory/get-activity-inventory` con un id inválido responde `400` (antes colgaba).
- ⚠ `req.query` usa el parser simple de Express 5: `?a[b]=1` ya no se convierte en objeto (ningún endpoint lo usa;
  los listados reciben sus filtros en el cuerpo).
- Las rutas con `:id` numérico siguen sin casar con valores no numéricos (404 de Express), igual que antes.

**Cambios del 2026-11-08 (decisiones 11-13):**
- ⚠ `PUT /groups/activity`, `/activity-purchase` y `/activity-add-transaction` responden 400 si el tipo de la operación
  no es el del listado ("El listado X es de … : solo admite movimientos de ese tipo"). Los listados antiguos de tipo 5
  admiten 13 y 16; las listas libres (sin detalle) no restringen.
- ⚠ `POST /groups/new-details` y `PUT /groups/edit-details` rechazan los tipos 5 (usar 13 o 16), 6, 9 y 10. Un listado
  antiguo de tipo 5 puede editarse conservando el 5 (sus líneas mantienen su tipo). `edit-details` solo cambia el tipo
  si las líneas lo admiten (13 ↔ 16 cambia todas las líneas); si no, 400 sin modificar nada.
- ⚠ Las operaciones de tipo 6, 9 y 10 se rechazan con 400.
- `POST /groups/list-by-group-antd`: `movimientoTipoId` admite un número o un arreglo (el front de bajas envía `[13, 16, 5]`).
- Los artículos nuevos (`PUT /groups/activity-purchase`) solo guardan el precio original (tipo 2) en `productoPrecios`.

**Retirado el 2026-11-08 (decisión 10):** el inventario físico por grupos nunca se terminó ni se usó. Se eliminan
`POST /groups/new-inventory`, `PUT /groups/edit-inventory`, `POST /groups/inventory-todo-list` y
`POST /groups/inventory-done-list` (ahora 404), y en el front la página huérfana `7.inventario/nuevo` y sus métodos de
servicio. La tabla `inventario_detalle` se conserva para los grupos antiguos que la referencien.

Contrato de listados `*/list-antd` y `*/list-by-*`: body `{ sortField, sortOrder, pagination:{current,pageSize}, filters }`
→ `{ results, filtered, pagination:{ current, pageSize, total, totalItems } }`
(`CommonController.listaTabla*`). `filtered` y `total` = filas que cumplen los filtros; `totalItems` = filas sin filtros
de la tabla (en los catálogos de inventario, igual a `total`). Un `sortField` sin alias se aplica a la entidad
principal; sin `sortField`, orden por su `id`.

## Autenticación (`/auth`)
| Método | Ruta | Roles | Controlador |
|---|---|---|---|
| POST | `/auth/login` | — | `Auth.login` body `{c, p}` → `{t}` (JWT 12 h con `{ui,u,si}`); con contraseña temporal `{t, cambiarPassword: true}` y el JWT lleva `cp` |
| POST | `/auth/logout` | jwt | `Auth.logout` (marca `Sesion.fechaFin`; `checkJwt` rechaza después ese token) |
| GET | `/auth/version` | — | `{ version }` (pública: la muestra el login) |
| GET | `/` | — | `{ estado: "ok" }` (comprobación de vida) |

## Movimientos (`/activity`)
| Método | Ruta | Roles | Controlador |
|---|---|---|---|
| GET | `/activity/prior-activity/:id` | MOVIMIENTO-ULTIMOMOVIMIENTO | `Movimiento.obtenerUltimoMovimiento` (`:id` = inventarioActualId) |
| GET | `/activity/get-group/:id` | MOVIMIENTO-OBTENERGRUPO | `Movimiento.obtenerGrupo` (corregido en fase 2) |
| GET | `/activity/:id` | MOVIMIENTO-DETALLE | `Movimiento.obtenerId` (+ `fecha`, relaciones, `saldoPendiente`; 404 si no existe) |
| GET | `/activity/history-by-current-inventory/:id` | MOVIMIENTO-HISTORIAL | `Movimiento.obtenerHistorialMovimiento` |
| GET | `/activity/:id/chain` | MOVIMIENTO-DETALLE | `MovimientoService.cadena` → `{ movimiento, relacionesComoDerivado: [{ id, origen, cantidad, tipo, fecha }], relacionesComoOrigen: [{ id, derivado, cantidad, tipo, fecha }], saldoPendiente }` |
| GET | `/activity/open-by-inventory/:inventarioActualId?proyectoId=` | MOVIMIENTO-HISTORIAL | `MovimientoService.abiertosPorInventario` → `[{ movimientoId, movimientoTipoId, movimientoTipo, proyectoId, proyecto, fecha, cantidad, aplicado, saldo }]` (salidas con saldo > 0, FIFO; sin legados) |

## Grupos / listados (`/groups`)
| Método | Ruta | Roles | Controlador |
|---|---|---|---|
| POST | `/groups/list-antd` | GRUPOS-LISTADETALLE | `Grupo.listaTabla` |
| POST | `/groups/list-by-project-antd` | GRUPOS-LISTADETALLE | `Grupo.listaTablaMovimientosPorProyecto` |
| POST | `/groups/list-by-group-antd` | GRUPOS-LISTADETALLE | `Grupo.listaTablaPorListado` |
| PUT | `/groups/disable/:id` · `/enable/:id` · `/closure/:id` | GRUPOS-DESHABILITAR · -HABILITAR · -FINALIZAR | estatus |
| GET | `/groups/:id` | GRUPOS-DETALLE | `Grupo.obtenerId` |
| PUT | `/groups/edit` | GRUPOS-EDITAR | `Grupo.editar` |
| POST | `/groups/new` | GRUPOS-NUEVO | grupo libre |
| DELETE | `/groups/remove` | GRUPOS-BORRAR | `Grupo.borrar` body `{grupoId}` (solo vacío) |
| POST | `/groups/new-details` | GRUPOS-NUEVODETALLE | grupo con `GrupoDetalle` (`proyectoId, movimientoTipoId, usuariosIds, nombre`) |
| POST | `/groups/new-purchase` | GRUPOS-NUEVOCOMPRA | grupo de compra con `FacturaDetalle` |
| PUT | `/groups/edit-details` · `/edit-purchase` | GRUPOS-EDITARDETALLE · -EDITARCOMPRA | edita cabecera y propaga proyecto/usuarios a las operaciones |
| POST | `/groups/activity-list-by-group` | GRUPOS-LISTAMOVIMIENTOS | movimientos de un grupo (`filters.grupos_id`) |
| POST | `/groups/active-activity-list` | GRUPOS-LISTAMOVIMIENTOSACTIVOS | salidas con saldo pendiente según `v_movimiento_saldo` (+ heurística anterior para inventarios legados); cada fila trae `saldoPendiente` (`proyectoId, usuariosIds, areasIds`) |
| PUT | `/groups/activity` | GRUPOS-MOVIMIENTONUEVO | **registra operación** sobre un artículo existente: `{codigo, cantidad, movimientoTipoId?, proyectoId, usuariosIds, grupoId, relaciones?, strict?}` → `MovimientoService.registrarOperacion` (sin tipo: línea de listado, `Movimiento.guardar`) |
| PUT | `/groups/activity-purchase` | GRUPOS-MOVIMIENTONUEVOCOMPRA | crea producto + inventario + movimiento en una transacción (tipos 15 compra, 14/1/2 alta) |
| PUT | `/groups/activity-add-transaction` | GRUPOS-MOVIMIENTOAGREGAROPERACION | añade operación a un movimiento sin operación `{movimientoId, movimientoTipoId, proyectoId, usuariosIds, relaciones?, strict?}` |
| DELETE | `/groups/activity` | GRUPOS-QUITARMOVIMIENTO | deshace un movimiento `{movimientoId}` → `MovimientoService.deshacer` (409 si es origen de otros) |
| POST | `/groups/create-list-from-{group,catalog,catalog-codes,catalog-deregister,catalog-projects,catalog-invoices,active-activity-list,report-use,report-activity}` | GRUPOS-CREARLISTADE* | crea un grupo libre copiando movimientos de otra fuente |
| POST | `/groups/similar-names-count` | jwt | `{nombre}` → `{conteo}` |

## Inventario actual (`/current-inventory`)
| Método | Ruta | Roles | Nota |
|---|---|---|---|
| GET | `/current-inventory/:id` | INVENTARIOACTUAL-DETALLE | |
| PUT | `/current-inventory/edit` | INVENTARIOACTUAL-EDITAR | solo `bodegaId` y `fechaDisponibilidad` |
| DELETE | `/current-inventory/delete` | INVENTARIOACTUAL-BORRAR | |
| POST | `/current-inventory/list-catalog-{general,codes,deregister,project,invoices}` | INVENTARIOACTUAL-CATALOGO* | búsquedas de catálogo (`invoices` → 501) |
| POST | `/current-inventory/get-activity-inventory` | INVENTARIOACTUAL-LISTADOMOVIMIENTOSINVENTARIO | body `{ inventarioActualId }` |

## Operaciones (`/transaction`)
| Método | Ruta | Roles |
|---|---|---|
| PUT | `/transaction/edit` | OPERACION-EDITAR (`operacionId, tipoMovimientoId, proyectoId, usuariosIds`; solo permite 13↔16; 409 si cambia el proyecto de una operación con relaciones) |
| POST / DELETE | `/transaction/file` | OPERACION-ARCHIVOSUBIR / -ARCHIVOBORRAR |
| PUT / DELETE | `/transaction/comment` | OPERACION-COMENTARIONUEVO / -COMENTARIOBORRAR |

## Archivos (`/file`)
| Método | Ruta | Roles | Nota |
|---|---|---|---|
| GET | `/file/:id` · `/thumbnail/:id` · `/catalog/:id` · `/review/:id` · `/report/:id` | jwt (cabecera `auth` o `?auth=`) | `ARCHIVOS_PUBLICOS=true` los deja públicos (transición) |
| POST | `/file/file` | ARCHIVO-ARCHIVOSUBIR | multer `upload.single('file')`, body `{relacion, id}` |
| DELETE | `/file/file` | ARCHIVO-ARCHIVOBORRAR | |
| DELETE | `/file/:id` | ARCHIVO-BORRAR | |
| POST | `/file/get-response-interface` | ARCHIVO-ARCHIVODATOS | |

## Catálogos CRUD (`/area`, `/warehouse`, `/supplier`, `/project`, `/user`, `/role`, `/invoice-kind`, `/parameters`)
Patrón común (`CommonController`): `GET /list-names` (`*-LISTASIMPLE`), `POST /list-antd`
(`*-LISTADETALLE`), `GET /:id` (`*-DETALLE`), `PUT /edit` (`*-EDITAR`), `POST /new` (`*-NUEVO`),
`PUT /disable/:id` · `/enable/:id` (`*-DESHABILITAR`/`*-HABILITAR`), `POST`/`DELETE /comment`
(`*-COMENTARIONUEVO`/`*-COMENTARIOBORRAR`). Extras:
- `/supplier/list-dynamic` (PROVEEDOR-LISTADINAMICA), `/project/list-names-inbound|outbound`.
- `/user/current` (jwt; `cambiarPassword: true` si la contraseña es temporal), `/user/password` (jwt, cambia la propia; `{pa, pn}` → `{t}`), `/user/renewpassword`
  (USUARIO-GENERERARPASSWORD; envía la contraseña por correo), `/user/get-areas|get-warehouses|get-projects` (jwt),
  `/user/list-names-full`, `/user/list-names-dynamic`.
- `/role/list-names-dynamic` (GET que lee `req.body`).
- `/parameters/edit` (PARAMETROS-EDITAR), `GET /parameters/comment` (PARAMETROS-LISTAR; lista parámetros).

## Producto y auxiliares (`/item`, `/item-spec`, `/item-code`, `/item-price`, `/item-review`, `/item-balance`)
| Método | Ruta | Roles |
|---|---|---|
| PUT | `/item/edit` | PRODUCTOS-EDITAR |
| POST / DELETE | `/item/file` · `/item/comment` | PRODUCTOS-ARCHIVO* · PRODUCTOS-COMENTARIO* |
| POST / PUT / DELETE | `/item-spec/new` · `/edit` · `/remove` | PRODUCTOCARACTERISTICAS-* |
| POST / DELETE | `/item-code/new` · `/new-self-generated` · `/remove` | PRODUCTOCLAVE-* |
| PUT | `/item-price/edit` | PRODUCTOPRECIO-EDITAR |
| POST | `/item-review/approve` · `/refuse` · `/no-review` | VALIDACIONES (ProductoValidado) |
| POST / GET | `/item-balance/in-balance` · `/out-balance` · `/no-review` · `/:id` | VALIDACIONES (ProductoInventariado) |

## Notificaciones (`/notifications`)

Solo `checkJwt` (sin rol): cada usuario ve y marca únicamente las suyas. Notificación:
`{ id, usuarioId, titulo, mensaje|null, tipo: "reporte"|"prestamo"|"sistema", url|null, leida, fecha, fechaLectura|null }`.
`url` es una ruta del front (`/prestamos/operacion?uid=3`) o un recurso del API que empieza por `/file/` (el front lo
abre con `?auth=`).

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/notifications?unread=1&page=N` | Arreglo, de la más reciente a la más antigua, 50 por página. `unread=1`: solo no leídas. |
| GET | `/notifications/count` | `{ noLeidas }` |
| PUT | `/notifications/:id/read` | La notificación con `leida: true` y `fechaLectura`. 404 si no existe o es de otro usuario. Idempotente. |
| PUT | `/notifications/read-all` | `{ actualizadas }` |
| GET | `/notifications/stream` | Server-Sent Events (`text/event-stream`). Token en la cabecera `auth` o en `?auth=`. Envía `retry: 10000`, `event: conteo` (`{ noLeidas }`) al conectar y cuando cambia, `event: notificacion` (la notificación) con cada nueva, y un comentario de latido cada 25 s. |

Productores: reportes (al terminar o fallar) y la tarea periódica de vencimientos (préstamos y rentas externas no
legados con saldo abierto de más de `DIAS_CUARENTENA` días, una vez por movimiento y usuario).

## Configuración (`/config`, plan 03)

Una sección por fila: `marca`, `correo`, `reportes`, `regional` (campos y valores por defecto en
`api/src/esquemas/configuracion.ts` y `docs/planes/03-personalizacion-por-cliente.md` §2.1).

| Método | Ruta | Auth | Respuesta |
|---|---|---|---|
| GET | `/config/public` | ninguna | `{ marca (sin logoId/faviconId), regional, logoUrl\|null, faviconUrl\|null, version }`; `ETag` y `Cache-Control: no-cache` (304 con `If-None-Match`) |
| GET | `/config/public/logo`, `/config/public/favicon` | ninguna | PNG de marca (solo archivos de tipo `MARCA-*`); sin configurar, el icono de Chronos WMS |
| GET | `/config` | `ADMINISTRADOR`/`CONFIGURACION-EDITAR` | `{ marca, correo, reportes, regional }`, cada una `{ valor, version }`. En `correo.transporte` nunca sale la contraseña: `tieneContrasena` |
| PUT | `/config/:seccion` | igual | Body `{ version, valor }` → `{ valor, version }`. 400 `{ errores: [{ campo, mensaje }] }` si no valida (campos desconocidos incluidos), 404 sección desconocida, 409 `{ version }` si otra persona guardó antes. En `correo.transporte.contrasena`: ausente = se conserva, `null` = se borra, texto = se cifra (400 sin `CONFIG_CLAVE`) |
| POST | `/config/marca/logo`, `/config/marca/favicon`, `/config/reportes/logo` | igual | multipart `file` (PNG/JPEG/WebP ≤ 2 MiB; SVG no) → la sección actualizada. Se normaliza a PNG (logo ≤ 512 px, favicon 192 px, reportes ≤ 512×256) y se borra la imagen anterior |

## Reportes (`/reports`)
| Método | Ruta | Roles | Nota |
|---|---|---|---|
| POST | `/reports/by-group` · `/by-project` · `/by-project-final` | REPORTE-GRUPO · -PROYECTO · -CIERRE | generan Excel en segundo plano en `RUTA_REPORTES`; se descargan por `GET /file/report/:nombre` |
| POST | `/reports/by-use` · `/by-group-detail` · `/by-invoice` · `/by-inventory` | REPORTE-* | `501 No implementado` |
