# Inventario de rutas del front

> **2026-11-07** · Origen: `front/src/router.tsx`, `front/src/services/menu/index.js`, `<ACL>` de cada página y
> cierre estático de imports de cada página (`src/pages/**`, `helpers/`) hasta `src/services/axios/<recurso>`;
> endpoints contrastados con `api/src/routes/*.Routes.ts`. **Conteo real: 68 filas** = 67 `path` activos
> (68 declarados − `/dashboard/alpha`) + la redirección `/`. De ellas, **62 rutas de negocio** (Administración 16,
> Catálogos 10, Operaciones 34, Reportes 2) y 6 de Auth/raíz. El plan 01 habla de 58 y `front/CLAUDE.md` de
> 64 rutas totales: 58 = 64 − 5 auth − 1 demo, así que la cifra parece venir de un recuento antiguo o
> erróneo de `router.tsx` (hoy hay 68 `path` activos y 1 comentado, `/articulos/editar/inventarioActual`).

Plan 01, fase 0, paso 2. Sirve de checklist para las fases 1–6 (no perder rutas, roles ni llamadas al migrar).

**Cómo leer la tabla**

- **Componente**: archivo cargado con `React.lazy` (todas las páginas son `index.tsx`).
- **Rol(es)**: código de la entrada de menú (`role`) y, si difiere, el del `<ACL roles={[…]} redirect>` raíz
  de la página (⚠️). `ADMINISTRADOR` está en todos los ACL y ve todo el menú, por eso no se repite. El menú
  (`app/menu/useMenuItems`) exige además el `role` de cada nodo padre (p. ej. `V-OPERACION-PRESTAMO`
  para las hojas de Préstamos). Una diferencia menú≠ACL significa que el usuario necesita **ambos** códigos:
  con solo el del menú ve la entrada y el ACL lo manda a `/auth/401`.
- **Endpoints**: rutas relativas a `REACT_APP_API_URL` (por defecto `/api/`). Es un cierre estático: incluye
  llamadas de componentes compartidos aunque dependan de una acción del usuario. Abreviaturas:
  - **[FORM-GRUPO]** (`operaciones/componentes/formaConfiguracionGrupo.js` y similares): `GET /invoice-kind/list-names`,
    `POST /supplier/list-dynamic`, `POST /user/list-names-dynamic`, `GET /user/get-areas`, `GET /user/get-warehouses`,
    `GET /user/get-projects`, `POST /groups/similar-names-count`.
  - **[REV]** (validación): `POST /item-review/approve`, `POST /item-review/refuse`, `POST /item-review/no-review`.
  - **[BAL]** (inventariado): `POST /item-balance/in-balance`, `POST /item-balance/out-balance`, `POST /item-balance/no-review`.
  - **[COM]** (comentarios): `POST /comments/new`, `DELETE /comments/comment`.
  - **[ARCH]** (archivos): `POST /file/file` (antd `Upload`, URL armada con `apiURLBase`), `DELETE /file/file`,
    `POST /file/get-response-interface`.
  - `GET /file/:id`, `/file/catalog/:id`, `/file/review/:id`, `/file/thumbnail/:id`: imágenes con URL armada
    con `apiURLBase` fuera de `services/axios` (`imaganesEnCarrusel.js`, `columnasTablaOperaciones.js`).
- **Llamadas globales** (layout, no ligadas a una ruta): `GET /auth/version` (TopBar), `GET /user/current`
  (saga `LOAD_CURRENT_ACCOUNT`), `POST /auth/logout`.

## Administración

| Ruta | Componente | Rol(es) | Endpoints del API consumidos | Crítica |
|---|---|---|---|:-:|
| `/usuarios/listado` | `src/pages/administracion/usuarios/listado/index.tsx` | `V-ADMINISTRACION-USUARIOSLISTADO` ≠ ACL `ADMINISTRACION-USUARIOSLISTADO` ⚠️ | `PUT /user/disable/:id`, `POST /user/list-antd`, `PUT /user/renewpassword/` |  |
| `/usuarios/cambiar-password` | `src/pages/administracion/usuarios/cambiarPassword/index.tsx` | `V-ADMINISTRACION-USUARIOSCAMBIARPASSWORD` · **sin ACL** ⚠️ | `PUT /user/password` |  |
| `/usuarios/nuevo` | `src/pages/administracion/usuarios/nuevo/index.tsx` | `V-ADMINISTRACION-USUARIOSNUEVO` ≠ ACL `USUARIO-NUEVO` ⚠️ | `GET /area/list-names`, `GET /project/list-names`, `GET /role/list-names`, `POST /user/new`, `GET /warehouse/list-names` |  |
| `/usuarios/editar` | `src/pages/administracion/usuarios/editar/index.tsx` | fuera del menú · ACL `USUARIO-EDITAR` | `GET /area/list-names`, `GET /project/list-names`, `GET /role/list-names`, `GET /user/:id`, `PUT /user/disable/:id`, `PUT /user/edit`, `PUT /user/enable/:id`, `GET /warehouse/list-names` |  |
| `/proyectos/listado` | `src/pages/administracion/proyectos/listado/index.tsx` | `V-ADMINISTRACION-PROYECTOSLISTADO` ≠ ACL `PROYECTO-LISTADO` ⚠️ | `PUT /project/disable/:id`, `POST /project/list-antd` |  |
| `/proyectos/nuevo` | `src/pages/administracion/proyectos/nuevo/index.tsx` | `V-ADMINISTRACION-PROYECTOSNUEVO` ≠ ACL `PROYECTO-NUEVO` ⚠️ | `POST /project/new` |  |
| `/proyectos/editar` | `src/pages/administracion/proyectos/editar/index.tsx` | fuera del menú · ACL `PROYECTO-EDITAR` | `GET /project/:id`, `PUT /project/disable/:id`, `PUT /project/edit`, `PUT /project/enable/:id` |  |
| `/proveedores/listado` | `src/pages/administracion/proveedores/listado/index.tsx` | `V-ADMINISTRACION-PROVEEDORESLISTADO` ≠ ACL `PROVEEDOR-LISTADO` ⚠️ | `PUT /supplier/disable/:id`, `POST /supplier/list-antd` |  |
| `/proveedores/nuevo` | `src/pages/administracion/proveedores/nuevo/index.tsx` | `V-ADMINISTRACION-PROVEEDORESNUEVO` ≠ ACL `PROVEEDOR-NUEVO` ⚠️ | `POST /supplier/new` |  |
| `/proveedores/editar` | `src/pages/administracion/proveedores/editar/index.tsx` | fuera del menú · ACL `PROVEEDOR-EDITAR` | `GET /supplier/:id`, `PUT /supplier/disable/:id`, `PUT /supplier/edit`, `PUT /supplier/enable/:id` |  |
| `/areas/listado` | `src/pages/administracion/areas/listado/index.tsx` | `V-ADMINISTRACION-AREASLISTADO` ≠ ACL `AREA-LISTADO` ⚠️ | `PUT /area/disable/:id`, `POST /area/list-antd` |  |
| `/areas/nuevo` | `src/pages/administracion/areas/nuevo/index.tsx` | `V-ADMINISTRACION-AREASNUEVO` ≠ ACL `AREA-NUEVO` ⚠️ | `POST /area/new` |  |
| `/areas/editar` | `src/pages/administracion/areas/editar/index.tsx` | fuera del menú · ACL `AREA-EDITAR` | `GET /area/:id`, `PUT /area/disable/:id`, `PUT /area/edit`, `PUT /area/enable/:id` |  |
| `/bodegas/listado` | `src/pages/administracion/bodegas/listado/index.tsx` | `V-ADMINISTRACION-BODEGASLISTADO` ≠ ACL `BODEGA-LISTADO` ⚠️ | `PUT /warehouse/disable/:id`, `POST /warehouse/list-antd` |  |
| `/bodegas/nuevo` | `src/pages/administracion/bodegas/nuevo/index.tsx` | `V-ADMINISTRACION-BODEGASNUEVO` ≠ ACL `BODEGA-NUEVO` ⚠️ | `POST /warehouse/new` |  |
| `/bodegas/editar` | `src/pages/administracion/bodegas/editar/index.tsx` | fuera del menú · ACL `BODEGA-EDITAR` | `GET /warehouse/:id`, `PUT /warehouse/disable/:id`, `PUT /warehouse/edit`, `PUT /warehouse/enable/:id` |  |

## Catálogos

| Ruta | Componente | Rol(es) | Endpoints del API consumidos | Crítica |
|---|---|---|---|:-:|
| `/catalogo/general` | `src/pages/catalogos/1.general/index.tsx` | `V-CATALOGO-GENERAL` (= ACL) | [REV], [BAL], `GET /activity/prior-activity/:id`, `POST /current-inventory/list-catalog-general`, `GET /file/catalog/:id`, `GET /user/get-areas`, `GET /user/get-warehouses` | ✅ |
| `/catalogo/por-codigos` | `src/pages/catalogos/2.porCodigos/index.tsx` | `V-CATALOGO-CODIGOS` (= ACL) | [REV], [BAL], `GET /activity/prior-activity/:id`, `POST /current-inventory/list-catalog-codes`, `GET /file/catalog/:id` | ✅ |
| `/catalogo/bajas` | `src/pages/catalogos/3.bajas/index.tsx` | `V-CATALOGO-BAJAS` (= ACL) | [REV], [BAL], `GET /activity/prior-activity/:id`, `POST /current-inventory/list-catalog-deregister`, `GET /file/catalog/:id`, `GET /user/get-areas`, `GET /user/get-warehouses` |  |
| `/catalogo/por-proyecto` | `src/pages/catalogos/4.porProyecto/index.tsx` | `V-CATALOGO-PROYECTO` (= ACL) | [REV], [BAL], `GET /activity/prior-activity/:id`, `POST /current-inventory/list-catalog-project`, `GET /file/catalog/:id`, `GET /user/get-areas`, `GET /user/get-projects`, `GET /user/get-warehouses` |  |
| `/catalogo/por-facturas` | `src/pages/catalogos/5.porFacturas/index.tsx` | fuera del menú · ACL `V-CATALOGO-FACTURAS` | [REV], [BAL], `GET /activity/prior-activity/:id`, `POST /current-inventory/list-catalog-project`, `GET /file/catalog/:id`, `GET /user/get-areas`, `GET /user/get-projects`, `GET /user/get-warehouses` |  |
| `/catalogo/validaciones` | `src/pages/catalogos/6.validaciones/index.tsx` | `V-CATALOGO-VALIDACIONES` (= ACL) | [REV], `POST /current-inventory/list-catalog-general`, `GET /file/review/:id`, `GET /user/get-areas`, `GET /user/get-warehouses` |  |
| `/articulos/detalle` | `src/pages/catalogos/articulos/detalle/index.tsx` | fuera del menú · ACL `V-ARTICULOS-DETALLE`; acción: `ARTICULOS-EDITAR` | [REV], [BAL], `GET /activity/history-by-current-inventory/:id`, `GET /current-inventory/:id`, `GET /file/:id`, `GET /file/catalog/:id`, `GET /item-balance/:id`, `POST /item-code/new`, `POST /item-code/new-self-generated`, `DELETE /item-code/remove`, `PUT /item-price/edit`, `PUT /item-spec/edit`, `POST /item-spec/new`, `DELETE /item-spec/remove` |  |
| `/articulos/editar/detalle` | `src/pages/catalogos/articulos/editarDetalle/index.tsx` | fuera del menú · ACL `V-EDITAR-ARTICULOS-DETALLE` | [COM], [ARCH], `GET /area/list-names`, `GET /current-inventory/:id`, `PUT /current-inventory/edit`, `POST /item-code/new`, `POST /item-code/new-self-generated`, `DELETE /item-code/remove`, `PUT /item-price/edit`, `PUT /item-spec/edit`, `POST /item-spec/new`, `DELETE /item-spec/remove`, `PUT /item/edit`, `GET /warehouse/list-names` |  |
| `/articulos/validado` | `src/pages/catalogos/articulos/detalleValidaciones/index.tsx` | fuera del menú · ACL `VALIDACIONES` | [REV], `GET /current-inventory/:id`, `GET /file/:id`, `GET /file/catalog/:id` |  |
| `/catalogo/inventario` | `src/pages/catalogos/7.inventarioVisual/index.tsx` | `V-CATALOGO-INVENTARIO` ≠ ACL `V-CATALOGO-INVENTARIOS` ⚠️ | [REV], [BAL], `GET /activity/prior-activity/:id`, `POST /current-inventory/list-catalog-codes`, `POST /current-inventory/list-catalog-general`, `GET /file/catalog/:id`, `GET /user/get-areas`, `GET /user/get-warehouses` |  |

## Operaciones

| Ruta | Componente | Rol(es) | Endpoints del API consumidos | Crítica |
|---|---|---|---|:-:|
| `/prestamos/nuevo` | `src/pages/operaciones/1.prestamos/nuevo/index.tsx` | `V-OPERACION-PRESTAMONUEVO` (= ACL) | [FORM-GRUPO], `POST /groups/new-details` | ✅ |
| `/prestamos/por-grupo` | `src/pages/operaciones/1.prestamos/listado/porGrupo/index.tsx` | `V-OPERACION-PRESTAMOPORGRUPO` (= ACL) | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/prestamos/por-proyecto` | `src/pages/operaciones/1.prestamos/listado/porProyecto/index.tsx` | `V-OPERACION-PRESTAMOPORPROYECTO` (= ACL) | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/list-by-project-antd`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/prestamos/operacion` | `src/pages/operaciones/1.prestamos/operacion/index.tsx` | fuera del menú · ACL `V-OPERACION-PRESTAMOOPERACION` | [REV], [BAL], [COM], [ARCH], `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `PUT /groups/activity`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `POST /reports/by-group` | ✅ |
| `/prestamos/activos` | `src/pages/operaciones/1.prestamos/listado/porActivos/index.tsx` | `V-OPERACION-PRESTAMOSACTIVOS` (= ACL) | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/active-activity-list`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/devoluciones/nuevo` | `src/pages/operaciones/2.devoluciones/nuevo/index.tsx` | `V-OPERACION-DEVOLUCIONNUEVO` ≠ ACL `DEVOLUCION-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new-details` | ✅ |
| `/devoluciones/nuevo-externa` | `src/pages/operaciones/2.devoluciones/nuevoExterno/index.tsx` | `V-OPERACION-DEVOLUCIONNUEVOEXTERNA` ≠ ACL `DEVOLUCION-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new-details` |  |
| `/devoluciones/por-grupo` | `src/pages/operaciones/2.devoluciones/listado/porGrupo/index.tsx` | `V-OPERACION-DEVOLUCIONPORGRUPO` ≠ ACL `OPERACION-DEVOLUCIONPORGRUPO` ⚠️ | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/devoluciones/por-proyecto` | `src/pages/operaciones/2.devoluciones/listado/porProyecto/index.tsx` | `V-OPERACION-DEVOLUCIONPORPROYECTO` ≠ ACL `OPERACION-DEVOLUCIONESPORPROYECTO` ⚠️ | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/list-by-project-antd`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/devoluciones/operacion` | `src/pages/operaciones/2.devoluciones/operacion/index.tsx` | fuera del menú · ACL `DEVOLUCION-OPERACION` | [REV], [BAL], [COM], [ARCH], `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `PUT /groups/activity`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `POST /reports/by-group` |  |
| `/bajas/nuevo` | `src/pages/operaciones/3.bajas/nuevo/index.tsx` | `V-OPERACION-BAJACONPROYECTO-NUEVO` ≠ ACL `BAJA-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new-details` | ✅ |
| `/bajas/por-grupo` | `src/pages/operaciones/3.bajas/listado/porGrupo/index.tsx` | `V-OPERACION-BAJACONPROYECTO-LISTADOPORGRUPO` ≠ ACL `OPERACION-BajasPORGRUPO` ⚠️ | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/bajas/por-proyecto` | `src/pages/operaciones/3.bajas/listado/porProyecto/index.tsx` | `V-OPERACION-BAJACONPROYECTO-LISTADOPORPROYECTO` ≠ ACL `OPERACION-BAJASPORPROYECTO` ⚠️ | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/list-by-project-antd`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/bajas/operacion` | `src/pages/operaciones/3.bajas/operacion/index.tsx` | fuera del menú · ACL `BAJAS-OPERACION` | [REV], [BAL], [COM], [ARCH], `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `PUT /groups/activity`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `POST /reports/by-group` |  |
| `/bajas/sin-proyecto/nuevo` | `src/pages/operaciones/3.bajas/deAdministrador/nuevo/index.tsx` | `V-OPERACION-BAJASINRPOYECTO-NUEVO` ≠ ACL `BAJASINRPOYECTO-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new-details` |  |
| `/bajas/sin-proyecto/por-grupo` | `src/pages/operaciones/3.bajas/deAdministrador/listado/porGrupo/index.tsx` | `V-OPERACION-BAJASINRPOYECTO-LISTADOPORPROYECTO` ≠ ACL `OPERACION-BajasPORGRUPO` ⚠️ | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/bajas/sin-proyecto/operacion` | `src/pages/operaciones/3.bajas/deAdministrador/operacion/index.tsx` | fuera del menú · ACL `BAJASINRPOYECTO-OPERACION` | [REV], [BAL], [COM], [ARCH], `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `PUT /groups/activity`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `POST /reports/by-group` |  |
| `/compras/nuevo` | `src/pages/operaciones/4.compras/nuevo/index.tsx` | `V-OPERACION-COMPRANUEVO` ≠ ACL `COMPRAS-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new-purchase` | ✅ |
| `/compras/por-factura` | `src/pages/operaciones/4.compras/listado/porGrupo/index.tsx` | `V-OPERACION-COMPRAPORGRUPO` ≠ ACL `OPERACION-COMPRASPORGRUPO` ⚠️ | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/compras/por-proyecto` | `src/pages/operaciones/4.compras/listado/porProyecto/index.tsx` | `V-OPERACION-COMPRAPORPROYECTO` ≠ ACL `OPERACION-COMPRASPORPROYECTO` ⚠️ | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/list-by-project-antd`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/compras/operacion` | `src/pages/operaciones/4.compras/operacion/index.tsx` | fuera del menú · ACL `COMPRAS-OPERACION` | [REV], [BAL], [COM], [ARCH], `GET /area/list-names`, `GET /current-inventory/:id`, `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/activity-purchase`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `PUT /item-spec/edit`, `POST /item-spec/new`, `DELETE /item-spec/remove`, `POST /reports/by-group`, `GET /warehouse/list-names` | ✅ |
| `/compras/editar` | `src/pages/operaciones/4.compras/editarGrupo/index.tsx` | fuera del menú · ACL `COMPRAS-NUEVO` | [FORM-GRUPO], `GET /groups/:id`, `PUT /groups/edit-purchase` |  |
| `/altas/nuevo` | `src/pages/operaciones/5.altas/nuevo/index.tsx` | `V-OPERACION-ALTANUEVO` ≠ ACL `ALTA-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new-details` |  |
| `/altas/por-grupo` | `src/pages/operaciones/5.altas/listado/porGrupo/index.tsx` | `V-OPERACION-ALTAPORGRUPO` ≠ ACL `OPERACION-ALTASPORGRUPO` ⚠️ | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/altas/operacion` | `src/pages/operaciones/5.altas/operacion/index.tsx` | fuera del menú · ACL `ALTAS-OPERACION` | [REV], [BAL], [COM], [ARCH], `GET /area/list-names`, `GET /current-inventory/:id`, `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/activity-purchase`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `PUT /item-spec/edit`, `POST /item-spec/new`, `DELETE /item-spec/remove`, `POST /reports/by-group`, `GET /warehouse/list-names` |  |
| `/renta-externa/nuevo` | `src/pages/operaciones/6.rentasExternas/nuevo/index.tsx` | `V-OPERACION-RENTAEXTERNANUEVO` ≠ ACL `RENTAEXTERNA-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new-details` |  |
| `/renta-externa/por-grupo` | `src/pages/operaciones/6.rentasExternas/listado/porGrupo/index.tsx` | `V-OPERACION-RENTAEXTERNAPORGRUPO` ≠ ACL `OPERACION-RENTAEXTERNAPORGRUPO` ⚠️ | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/renta-externa/por-proyecto` | `src/pages/operaciones/6.rentasExternas/listado/porProyecto/index.tsx` | `V-OPERACION-RENTAEXTERNAPORPROYECTO` ≠ ACL `OPERACION-RENTASPORPROYECTO` ⚠️ | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/list-by-project-antd`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/renta-externa/operacion` | `src/pages/operaciones/6.rentasExternas/operacion/index.tsx` | fuera del menú · ACL `RENTAEXTERNA-OPERACION` | [REV], [BAL], [COM], [ARCH], `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `PUT /groups/activity`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `POST /reports/by-group` |  |
| `/renta-externa/activos` | `src/pages/operaciones/6.rentasExternas/listado/porActivos/index.tsx` | `V-OPERACION-RENTAEXTERNAACTIVA` ≠ ACL `OPERACION-RENTAACTIVAPORPROYECTO` ⚠️ | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/active-activity-list`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/previo/nuevo` | `src/pages/operaciones/8.previo/nuevo/index.tsx` | `V-OPERACION-PREVIONUEVO` ≠ ACL `PREVIO-NUEVO` ⚠️ | [FORM-GRUPO], `POST /groups/new` |  |
| `/previo/por-grupo` | `src/pages/operaciones/8.previo/listado/porGrupo/index.tsx` | `V-OPERACION-PREVIOPORGRUPO` ≠ ACL `OPERACION-PREVIOPORGRUPO` ⚠️ | `POST /groups/list-by-group-antd`, `DELETE /groups/remove` |  |
| `/previo/operacion` | `src/pages/operaciones/8.previo/operacion/index.tsx` | fuera del menú · ACL `PREVIO-OPERACION` | [REV], [BAL], [COM], [ARCH], `GET /file/:id`, `GET /file/catalog/:id`, `GET /file/thumbnail/:id`, `GET /groups/:id`, `PUT /groups/activity`, `DELETE /groups/activity`, `POST /groups/activity-list-by-group`, `PUT /groups/disable/:id`, `PUT /groups/enable/:id`, `POST /reports/by-group` |  |
| `/movimientos/detalle` | `src/pages/operaciones/movimiento/index.tsx` | fuera del menú · ACL `DETALLE-MOVIMIENTO` | [COM], [ARCH], `GET /activity/:id`, `GET /activity/history-by-current-inventory/:id`, `GET /file/:id`, `GET /file/catalog/:id` | ✅ |

## Reportes

| Ruta | Componente | Rol(es) | Endpoints del API consumidos | Crítica |
|---|---|---|---|:-:|
| `/reportes/por-usuario` | `src/pages/reportes/6.porUsuario/index.tsx` | `V-REPORTES-GENERAL` ≠ ACL `V-OPERACION-PRESTAMOSACTIVOS` ⚠️ | `GET /file/:id`, `GET /file/thumbnail/:id`, `POST /groups/active-activity-list`, `POST /reports/by-project`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |
| `/reportes/de-cierre` | `src/pages/reportes/3.cierreProyecto/index.tsx` | `V-REPORTES-GENERAL` ≠ ACL solo `ADMINISTRADOR` ⚠️ | `POST /reports/by-project-final`, `GET /user/get-areas`, `GET /user/get-projects`, `POST /user/list-names-dynamic` |  |

## Auth y raíz

| Ruta | Componente | Rol(es) | Endpoints del API consumidos | Crítica |
|---|---|---|---|:-:|
| `/` | — (redirección en `router.tsx`) | — | Redirige a `/catalogo/validaciones` si `permisos` incluye `VALIDACIONES`; si no, a `/catalogo/general` | |
| `/auth/login` | `src/app/auth/LoginPage.tsx` | pública | `GET /auth/version`; vía `stores/usuario.store`: `POST /auth/login` (`{c, p}`, sin `ip`: F2) y `GET /user/current` | ✅ |
| `/auth/401` | `src/app/errors/ErrorPage.tsx` (`code={401}`) | pública | — |  |
| `/auth/404` | `src/app/errors/ErrorPage.tsx` (`code={404}`) | pública | — |  |
| `/auth/500` | `src/app/errors/ErrorPage.tsx` (`code={500}`) | pública | — |  |
| `/auth/503` | `src/app/errors/ErrorPage.tsx` (`code={503}`) | pública | — |  |

## Servicios y endpoints

Traducción de los helpers de `PeticionBase` (`src/services/axios/index.js`), con `R` = `portionEndPoint`:

| Helper | HTTP |
|---|---|
| `listadoSimple(R)` | `GET /R/list-names` |
| `listado(R, p)` | `POST /R/list-antd` (cuerpo `{ sortField, sortOrder, pagination, filters… }`) |
| `obtenerId(R, id)` | `GET /R/:id` |
| `editar(R, p)` / `nuevo(R, p)` | `PUT /R/edit` / `POST /R/new` |
| `habilitar(R, id)` / `inhabilitar(R, id)` | `PUT /R/enable/:id` / `PUT /R/disable/:id` |
| `finalizar(R, id)` | `PUT /R/closure/:id` (ningún servicio lo usa) |
| `generalGet(R, e, x)` / `generalGetNoParam(R, e)` | `GET /R/e/x` / `GET /R/e` |
| `generalPost` / `generalPostBlob` / `generalPut(R, e, p)` | `POST` / `POST` (blob) / `PUT /R/e` |
| `generalDelete(R, e, p)` | `DELETE /R/e` **con cuerpo** |

"Sin uso" = ningún archivo de negocio (`pages`, `components`, `redux`, `services/jwt`) lo invoca.
Todas las rutas listadas existen en `api/src/routes`, salvo la marcada ❌.

### `archivos` (`file`)

| Método | HTTP |
|---|---|
| `quitarArchivo` | `DELETE /file/file` |
| `obtenerResponseFileDeId` | `POST /file/get-response-interface` |
| (subida) | `POST /file/file`: la hace el `Upload` de `pages/componentes/subirArchivos.tsx` con `apiURLBase` y token de `localStorage` (F11) |

### `areas` (`area`) · `bodegas` (`warehouse`) · `proyectos` (`project`)

Mismos 7 métodos estándar: `listadoSimple` → `GET /R/list-names`, `listado` → `POST /R/list-antd`, `obtenerId` → `GET /R/:id`,
`editar` → `PUT /R/edit`, `nuevo` → `POST /R/new`, `habilitar` → `PUT /R/enable/:id`, `inhabilitar` → `PUT /R/disable/:id`.
(La clase de `bodegas` se llama `BodegaPeticiones`, la de `proyectos` `ProyectoPeticiones`.)

### `autorizacion` (`auth`, no extiende `PeticionBase`)

| Método | HTTP |
|---|---|
| `login(email, password)` | `GET https://api.ipify.org` con `axios` directo (F2) → `POST /auth/login` `{ c, p, ip }`; guarda `t` |
| `logout` | `POST /auth/logout` |
| `version` | `GET /auth/version` |

### `comentarios` (`comments`)

| Método | HTTP |
|---|---|
| `nuevo` | `POST /comments/new` |
| `quitar` | `DELETE /comments/comment` |

### `facturaTipos` (`invoice-kind`)

| Método | HTTP |
|---|---|
| `listadoSimple` | `GET /invoice-kind/list-names` |

### `grupos` (`groups`)

| Método | HTTP | Nota |
|---|---|---|
| `listado` | `POST /groups/list-antd` | sin uso |
| `listadoPorProyecto` | `POST /groups/list-by-project-antd` | |
| `listadoPorGrupo` | `POST /groups/list-by-group-antd` | |
| `habilitar` / `inhabilitar` | `PUT /groups/enable/:id` / `PUT /groups/disable/:id` | |
| `finalizar` | ❌ `PUT /groups/list-by-group-antd` | **F3**: debería ser `PUT /groups/closure/:id` (que sí existe en el API); la ruta usada no existe como PUT. Sin uso hoy |
| `obtenerId` | `GET /groups/:id` | |
| `nuevo` / `editar` | `POST /groups/new` / `PUT /groups/edit` | `editar` sin uso |
| `quitar` | `DELETE /groups/remove` | |
| `nuevoConCompra` / `nuevoConDetalles` / `nuevoConInventario` | `POST /groups/new-purchase` / `new-details` / `new-inventory` | `nuevoConInventario` solo en `operaciones/7.inventario/nuevo` (sin ruta) |
| `editarConDetalle` / `editarConCompra` / `editarconInventario` | `PUT /groups/edit-details` / `edit-purchase` / `edit-inventory` | solo `editarConCompra` en uso |
| `movimientosPorGrupo` | `POST /groups/activity-list-by-group` | |
| `movimientosActivosProyecto` | `POST /groups/active-activity-list` | |
| `inventarioPendiente` / `inventarioHecho` | `POST /groups/inventory-todo-list` / `inventory-done-list` | sin uso |
| `agregarMovimiento` | `PUT /groups/activity` | |
| `agregarMovimientoCompra` | `PUT /groups/activity-purchase` | compras y altas (`formaAC.js`) |
| `agregarOperacionAMovimiento` | `PUT /groups/activity-add-transaction` | sin uso |
| `quitarMovimiento` | `DELETE /groups/activity` | |
| `nuevoListadoDe{Grupo, CatalogoGeneral, CatalogoCodigo, CatalogoBajas, CatalogoProyectos, CatalogoFacturas, PendientesActivos, ReporteUso, ReporteMovimiento}` | `POST /groups/create-list-from-{group, catalog, catalog-codes, catalog-deregister, catalog-projects, catalog-invoices, active-activity-list, report-use, report-activity}` | los 9 sin uso |
| `obtenerConteoNombresSimilares` | `POST /groups/similar-names-count` | |

### `inventarioActual` (`current-inventory`)

| Método | HTTP | Nota |
|---|---|---|
| `listadoCatalogoGeneral` | `POST /current-inventory/list-catalog-general` | |
| `listadoCatalogoPorCodigo` | `POST /current-inventory/list-catalog-codes` | |
| `listadoCatalogoBajas` | `POST /current-inventory/list-catalog-deregister` | |
| `listadoCatalogoProyectos` | `POST /current-inventory/list-catalog-project` | también lo usa `/catalogo/por-facturas` |
| `listadoCatalogoFacturas` | `POST /current-inventory/list-catalog-invoices` | sin uso |
| `obtenerId` / `editar` | `GET /current-inventory/:id` / `PUT /current-inventory/edit` | |

### `movimientos` (`activity`)

| Método | HTTP | Nota |
|---|---|---|
| `obtenerUltimoMovimiento` | `GET /activity/prior-activity/:id` | `catalogos/componentes/tarjetaProducto.js` |
| `obtenerGrupo` | `GET /activity/get-group/:id` | sin uso |
| `obtenerId` | `GET /activity/:id` | |
| `obtenerHistorial` | `GET /activity/history-by-current-inventory/:id` | `pages/componentes/movimientos.tsx` |

### `productoCaracteristicas` (`item-spec`) · `productoClaves` (`item-code`) · `productoPrecios` (`item-price`)

| Método | HTTP |
|---|---|
| `productoCaracteristicas.nuevo` / `editar` / `borrar` | `POST /item-spec/new` / `PUT /item-spec/edit` / `DELETE /item-spec/remove` |
| `productoClaves.nuevo` / `nuevoAutogenerado` / `borrar` | `POST /item-code/new` / `POST /item-code/new-self-generated` / `DELETE /item-code/remove` |
| `productoPrecios.editar` | `PUT /item-price/edit` |

### `productoInventariado` (`item-balance`) · `productoValidado` (`item-review`)

| Método | HTTP |
|---|---|
| `productoInventariado.inventarioExiste` / `inventarioNoExiste` / `noRevisado` | `POST /item-balance/in-balance` / `out-balance` / `no-review` |
| `productoInventariado.obtenerId` | `GET /item-balance/:id` |
| `productoValidado.validar` / `invalidar` / `noRevisado` | `POST /item-review/approve` / `refuse` / `no-review` |

(Ambas clases se llaman `ProductoValidado`.)

### `productos` (`item`)

| Método | HTTP | Nota |
|---|---|---|
| `agregarComentario` / `quitarComentario` | `PUT /item/comment` / `DELETE /item/comment` | sin uso |
| `editar` | `PUT /item/edit` | |

### `proveedores` (`supplier`)

7 métodos estándar (ver `areas`) + `listadoSimpleDinamico` → `POST /supplier/list-dynamic`. `listadoSimple` sin uso.

### `reportes` (`reports`)

| Método | HTTP | Nota |
|---|---|---|
| `porGrupo` | `POST /reports/by-group` | `operaciones/componentes/tablaOperaciones.js` |
| `porProyecto` | `POST /reports/by-project` | |
| `porInventario` | `POST /reports/by-inventory` | sin uso (solo en `reportes/5.inventario`, sin ruta, y comentado) |
| `deCierre` | `POST /reports/by-project-final` | |

### `roles` (`role`)

| Método | HTTP |
|---|---|
| `listadoSimple` | `GET /role/list-names` (la clase se llama `ProyectoPeticiones`) |

### `usuarios` (`user`)

| Método | HTTP | Nota |
|---|---|---|
| 7 estándar (`listadoSimple`, `listado`, `obtenerId`, `editar`, `nuevo`, `habilitar`, `inhabilitar`) | como `areas` con `R = user` | |
| `listadoSimpleCompleto` | `GET /user/list-names-full` | sin uso (tampoco `listadoSimple`) |
| `listadoSimpleDinamico` | `POST /user/list-names-dynamic` | |
| `regenerarPassword(email)` | `PUT /user/renewpassword/` | `apiClient` directo, barra final |
| `cambiarPassword(p)` | `PUT /user/password` | `apiClient` directo; el comentario dice `old_usua_password/new_usua_password`, la página envía `{ pa, pn }` |
| `actual` | `GET /user/current` | |
| `obtenerAreas` / `obtenerBodegas` / `obtenerProyectos` | `GET /user/get-areas` / `get-warehouses` / `get-projects` | |

## Observaciones

1. **Dos familias de códigos de rol.** El menú usa códigos `V-*` y solo **9 de 43** entradas coinciden con el ACL de
   su página (5 de Catálogos y las 4 de Préstamos). Las otras 33 usan códigos distintos (`USUARIO-NUEVO`,
   `DEVOLUCION-NUEVO`, `OPERACION-COMPRASPORGRUPO`…), que son los mismos que valida el API (`checkRole` en
   `api/src/routes/*`). Habría que confirmar en la BD que cada perfil tiene ambos códigos. Si no los tiene, el
   usuario ve la entrada del menú y el ACL lo manda a `/auth/401`.
2. **Errores evidentes de código de rol** (aparte de la diferencia sistemática):
   - `/catalogo/inventario`: menú `V-CATALOGO-INVENTARIO` y ACL `V-CATALOGO-INVENTARIOS` (plural).
   - `/reportes/por-usuario`: ACL `V-OPERACION-PRESTAMOSACTIVOS`, y además llama a los mismos endpoints que
     `/prestamos/activos`; parece una copia sin terminar.
   - `/reportes/de-cierre`: el menú pide `V-REPORTES-GENERAL`, pero el ACL solo deja pasar a `ADMINISTRADOR`.
   - `/bajas/sin-proyecto/por-grupo`: el menú pide `…-LISTADOPORPROYECTO` aunque la página es por grupo; el ACL
     `OPERACION-BajasPORGRUPO` (mayúsculas y minúsculas mezcladas) es el mismo de `/bajas/por-grupo`.
   - Códigos reutilizados: `/devoluciones/nuevo-externa` usa `DEVOLUCION-NUEVO` y `/compras/editar` usa `COMPRAS-NUEVO`.
   - La errata `BAJASINRPOYECTO` (por `BAJASINPROYECTO`) está igual en el menú y en el ACL.
3. **Redirección `/`**: va a `/catalogo/validaciones` si el usuario tiene `VALIDACIONES`, pero esa página exige
   `V-CATALOGO-VALIDACIONES`. Un usuario que tenga solo `VALIDACIONES` termina en `/auth/401`, y lo mismo pasa con
   `/catalogo/general` si le falta `V-CATALOGO-GENERAL`.
4. **Páginas sin ACL**: solo `/usuarios/cambiar-password` (cambia la contraseña propia; está en el menú de
   Administración con `V-ADMINISTRACION-USUARIOSCAMBIARPASSWORD`) y las `/auth/*`, que son públicas.
5. **`/catalogo/por-facturas`** está fuera del menú (la entrada comentada apunta a `/catalogo/por-Facturas`) y llama a
   `list-catalog-project` en lugar de `list-catalog-invoices` (`listadoCatalogoFacturas` no se usa en ningún sitio).
6. **Rutas fuera del menú (19)**: las 5 `*/editar` de Administración, `/catalogo/por-facturas`, las 3 `/articulos/*`,
   las 8 `*/operacion`, `/compras/editar` y `/movimientos/detalle`. Se llega a ellas desde enlaces de tablas
   (parámetro `?uid=` en la query).
7. **Rutas comentadas o páginas sin ruta**: `/articulos/editar/inventarioActual` (ruta comentada; sus archivos
   están vacíos), `operaciones/7.inventario/nuevo` (82 líneas, F6), `reportes/5.inventario` (121 líneas),
   `administracion/parametros/editar` y `reportes/{1.general,2.movimientos/inde.js,4.ultimoUso}` (vacíos, F15).
8. **Menú**: ninguna entrada activa apunta a una ruta inexistente. Las entradas comentadas sí apuntan a rutas que
   no existen (`/inventario/*`, `/operacion/editar`, `/reporte/{general,movimientos,cierre,depuracion}`,
   `/parametros`).
9. **URLs del API armadas fuera de `services/axios`** con `apiURLBase`: imágenes (`/file/…`), miniaturas
   (`/file/thumbnail/:id`) y subida (`/file/file`). Hay que tenerlas en cuenta al cambiar `REACT_APP_API_URL` → `VITE_*`.
10. **Servicios**: 25 métodos sin uso (17 de `grupos`; ver tablas), clases con nombre copiado (`productoInventariado` y `roles`),
    `generalGet` arma `/R/e/undefined` si falta el parámetro, y todos los `generalDelete` mandan el cuerpo en un
    `DELETE`. El único endpoint del front que no existe en el API es el de `grupos.finalizar` (F3).
