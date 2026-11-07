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

Contrato de listados `*/list-antd` y `*/list-by-*`: body `{ sortField, sortOrder, pagination:{current,pageSize}, filters }`
→ `{ results, filtered, pagination:{ current, pageSize, total, totalItems } }`
(`CommonController.listaTabla*`).

## Autenticación (`/auth`)
| Método | Ruta | Roles | Controlador |
|---|---|---|---|
| POST | `/auth/login` | — | `Auth.login` body `{c, p, ip}` → `{t}` (JWT 12 h con `{ui,u,si}`) |
| POST | `/auth/logout` | jwt | `Auth.logout` (marca `Sesion.fechaFin`) |
| GET | `/auth/version`, `/` | — | nombre y versión del paquete |

## Movimientos (`/activity`)
| Método | Ruta | Roles | Controlador |
|---|---|---|---|
| GET | `/activity/prior-activity/:id` | MOVIMIENTO-ULTIMOMOVIMIENTO | `Movimiento.obtenerUltimoMovimiento` (`:id` = inventarioActualId) |
| GET | `/activity/get-group/:id` | MOVIMIENTO-OBTENERGRUPO | `Movimiento.obtenerGrupo` (corregido en fase 2) |
| GET | `/activity/:id` | MOVIMIENTO-DETALLE | `Movimiento.obtenerId` |
| GET | `/activity/history-by-current-inventory/:id` | MOVIMIENTO-HISTORIAL | `Movimiento.obtenerHistorialMovimiento` |

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
| POST | `/groups/new-inventory` | GRUPOS-NUEVOINVENTARIO | grupo de inventario (`fechaInicio, fechaFin, bodegaId`) con un movimiento por inventario activo |
| PUT | `/groups/edit-details` · `/edit-purchase` · `/edit-inventory` | GRUPOS-EDITARDETALLE · -EDITARCOMPRA · -EDITARINVENTARIO | edita cabecera y propaga proyecto/usuarios a las operaciones |
| POST | `/groups/activity-list-by-group` | GRUPOS-LISTAMOVIMIENTOS | movimientos de un grupo (`filters.grupos_id`) |
| POST | `/groups/active-activity-list` | GRUPOS-LISTAMOVIMIENTOSACTIVOS | préstamos/rentas pendientes (`proyectoId, usuariosIds`) |
| POST | `/groups/inventory-todo-list` · `/inventory-done-list` | GRUPOS-LISTAINVENTARIOPENDIENTE · -LISTAINVENTARIOHECHO | pendientes/hechos de un inventario |
| PUT | `/groups/activity` | GRUPOS-MOVIMIENTONUEVO | **registra operación** sobre un artículo existente: `{codigo, cantidad, movimientoTipoId?, proyectoId, usuariosIds, grupoId}` → `Movimiento.guardar` / `guardarConOperacion` |
| PUT | `/groups/activity-purchase` | GRUPOS-MOVIMIENTONUEVOCOMPRA | crea producto + inventario + movimiento (tipos 15 compra, 14/1/2 alta) |
| PUT | `/groups/activity-add-transaction` | GRUPOS-MOVIMIENTOAGREGAROPERACION | añade operación a un movimiento sin operación `{movimientoId, movimientoTipoId, proyectoId, usuariosIds}` |
| DELETE | `/groups/activity` | GRUPOS-QUITARMOVIMIENTO | deshace un movimiento `{movimientoId}` |
| POST | `/groups/create-list-from-{group,catalog,catalog-codes,catalog-deregister,catalog-projects,catalog-invoices,active-activity-list,report-use,report-activity}` | GRUPOS-CREARLISTADE* | crea un grupo libre copiando movimientos de otra fuente |
| POST | `/groups/similar-names-count` | jwt | `{nombre}` → `{conteo}` |
| GET | `/groups/export-to-supabase/:id` | ADMIN | exportador legado (código mayormente comentado) |

## Inventario actual (`/current-inventory`)
| Método | Ruta | Roles | Nota |
|---|---|---|---|
| GET | `/current-inventory/:id` | INVENTARIOACTUAL-DETALLE | |
| PUT | `/current-inventory/edit` | INVENTARIOACTUAL-EDITAR | solo `bodegaId` y `fechaDisponibilidad` |
| DELETE | `/current-inventory/delete` | INVENTARIOACTUAL-BORRAR | |
| POST | `/current-inventory/list-catalog-{general,codes,deregister,project,invoices}` | INVENTARIOACTUAL-CATALOGO* | búsquedas de catálogo (`invoices` → 501) |
| POST | `/current-inventory/get-activity-inventory` | INVENTARIOACTUAL-LISTADOMOVIMIENTOSINVENTARIO | body `{ inventarioActualId }` |
| GET | `/current-inventory/export-to-supabase/:id` | ADMIN | legado |

## Operaciones (`/transaction`)
| Método | Ruta | Roles |
|---|---|---|
| PUT | `/transaction/edit` | OPERACION-EDITAR (`operacionId, tipoMovimientoId, proyectoId, usuariosIds`; solo permite 13↔16) |
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
- `/user/current` (jwt), `/user/password` (jwt, cambia la propia), `/user/renewpassword`
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

## Reportes (`/reports`)
| Método | Ruta | Roles | Nota |
|---|---|---|---|
| POST | `/reports/by-group` · `/by-project` · `/by-project-final` | REPORTE-GRUPO · -PROYECTO · -CIERRE | generan Excel en segundo plano en `RUTA_REPORTES`; se descargan por `GET /file/report/:nombre` |
| POST | `/reports/by-use` · `/by-group-detail` · `/by-invoice` · `/by-inventory` | REPORTE-* | `501 No implementado` |
