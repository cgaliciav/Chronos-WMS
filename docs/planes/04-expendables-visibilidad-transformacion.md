# Plan 04 · Expendables, cantidades, visibilidad exclusiva y transformación

## Contexto

Se necesitan con urgencia cinco capacidades: expendables sin pendiente de devolución, préstamo y devolución
parciales por cantidad, transformación de un producto en otros, y dos modos de visibilidad restringida
(PRODUCCIÓN EXCLUSIVA y USUARIO EXCLUSIVO).

Estado actual (verificado en el código):

- El API ya presta X y devuelve Z con saldo (`movimiento_relacion`, vista `v_movimiento_saldo`), pero el front envía
  `cantidad: 1` fijo en seis pantallas.
- Existe `producto_tipo` 2 CONSUMIBLE, pero ninguna regla lo lee y el front guarda siempre tipo 1.
- Toda baja pone el inventario en 0/0 sin importar la cantidad (`efectosInventario.ts:45`).
- "Producción" = `Proyecto`. `checkRole` calcula `usuarioProyectos` pero nadie lo usa: no hay filtrado de filas en servidor.
- No existe nada para transformar productos; `movimiento_relacion` solo une movimientos del mismo inventario.

## Decisiones del propietario (anotar en `docs/decisiones.md`, no reabrir)

1. Expendable = producto de tipo CONSUMIBLE. Al prestarlo se da por consumido: bajan disponible y total, sin pendiente.
   Si se devuelven Z, suben ambos Z. Una COMPRA de expendable queda a nombre de la producción sin sumar existencias
   ni pendiente; el ALTA sí suma.
2. Préstamo, devolución y bajas por cantidad. El producto queda en `baja` solo al llegar a cero.
3. Transformación: siempre con la producción. Se descuenta del pendiente de esa producción la cantidad usada (puede
   ser parcial) y se crean uno o más productos nuevos con su código, ligados al original, a cargo de la producción.
4. Modo de visibilidad por usuario: `general | produccion | usuario`.
   - Producción: ve productos cuya compra o creación por transformación fue de uno de sus proyectos asignados, o cuyo
     último movimiento es de uno de ellos.
   - Usuario: ve productos donde, en cualquier movimiento, es responsable o quien lo registró.
   - Lo que no ve tampoco lo puede operar. El rol ADMINISTRADOR ignora el modo.
5. Orden de entrega: A, B, C. Un PR por bloque.

Decisiones mías (revisables): las transferencias 7/12 de expendables se rechazan; el escaneo de un artículo no visible
responde el mismo 400 "no existe" de hoy; transformaciones sin deshacer en la primera versión; el front muestra el
tipo 2 como "Expendable" (el catálogo conserva el nombre CONSUMIBLE).

## Preparación

- Rama o worktree por bloque (puede haber otra sesión en el mismo árbol).
- Primer commit: este plan como `docs/planes/04-expendables-visibilidad-transformacion.md`, decisiones nuevas en
  `docs/decisiones.md` y la entrada en `CLAUDE.md` raíz.
- Cada bloque sube Menor en `api/` y `front/` (`npm version X.Y.0-d --no-git-tag-version`) y anota su `CHANGELOG.md`.
- Todo con TDD: prueba primero, siguiendo los patrones de `api/src/test/` y `front/src/test/`.

## Bloque A · Cantidades, bajas por cantidad y expendables

### API

1. **Migración `ConsumiblesYBajasPorCantidad`** (nueva, registrada en `api/src/migration/index.ts`):
   - `movimiento.consumible tinyint default 0`, `movimiento.efectoCantidad` y `efectoAlmacen` `decimal(15,4) NULL`
     (deltas con signo aplicados al inventario; NULL en lo anterior).
   - `INSERT IGNORE producto_tipo (2, 'CONSUMIBLE')`; aborta si el id 2 existe con otro nombre.
   - Recrea `v_movimiento_saldo` con `AND m.consumible = 0` (constante nueva; el `down` usa `SQL_VISTA_SALDO`).
2. `entity/Movimiento.ts`, enum nuevo `entity/common/ProductoTipoId.ts`, `test/seed.ts` (tipo 2),
   `test/factories.ts` (`productoTipoId` opcional en `crearArticulo`).
3. **`services/reglas/efectosInventario.ts`**: `aplicarEfecto(tipo, estado, n, { consumible })`.
   - Bajas 13/16/5: `cantidadAlmacen −= n`, exige `n ≤ cantidadAlmacen − cantidad`.
   - Bajas 8/17: primero almacén y el excedente de lo que está fuera (`deAlmacen = min(n, cantidad)`); con
     `n = cantidadAlmacen` se comporta como hoy.
   - `baja` solo si `cantidadAlmacen` queda en 0.
   - Expendable: salida (3, 11) `−n/−n`; regreso (4) `+n/+n` sin exigir préstamo; compra 15 `0/0`; bajas `−n/−n`
     del almacén; 7/12 → 400. Al quedar en 0 es `no-disponible`, nunca `baja`.
   - `revertirDeltas(estado, efectoCantidad, efectoAlmacen)` para deshacer.
4. **`services/reglas/planificarRelaciones.ts`**: `planBajaLibre` reparte FIFO solo la parte que sale de lo prestado.
5. **`services/MovimientoService.ts`**: tras el bloqueo lee `productoTipoId`; guarda `consumible` y los deltas;
   `resolverRelaciones` devuelve plan vacío para expendables (y rechaza `relaciones` explícitas); `deshacer` usa los
   deltas cuando existen (bajas nuevas y expendables) y el camino actual por instantánea cuando son NULL.
6. **`controllers/Producto.Controller.ts`**: cambiar el tipo de un producto exige `cantidad === cantidadAlmacen`
   bajo bloqueo. Endpoint `GET /product-types/list`.

### Front

7. Campo **Cantidad** (por defecto 1, se reinicia tras cada lectura) en `pages/operaciones/componentes/formaPDBP.tsx`
   y en las seis `pages/operaciones/*/operacion/index.tsx` que hoy envían `cantidad: 1`; muestra la existencia del
   artículo para que una baja de 1 sobre varias unidades sea evidente.
8. Selector de tipo (Regular / Expendable) en `componentes/formaAC.tsx` y `catalogos/articulos/editarDetalle`
   (deja de enviar `productoTipoId: 1` fijo).
9. Columna **Pendiente** (`saldoPendiente`) en préstamos activos y reporte por usuario.

### Pruebas

- Unitarias: efectos de baja parcial y total, efectos de expendable, `revertirDeltas`, FIFO parcial de baja libre.
- Integración (`relaciones.int.test.ts` y archivo nuevo `consumibles.int.test.ts`): préstamo y devolución de
  expendable sin pendiente ni aviso de vencimiento, devolución sin préstamo previo, compra 0/0, 7/12 → 400, deshacer,
  baja antigua sin deltas, guarda de cambio de tipo. Ajustar la prueba que espera "baja deja todo en 0".
- Front: `formaPDBP` envía la cantidad; selector de tipo; columna de pendiente.

## Bloque B · Modos de visibilidad

1. **Migración**: `usuario.modoVisibilidad enum('general','produccion','usuario') NOT NULL DEFAULT 'general'`.
   Entidad, `usuarioNuevoSchema` (hoy `.strip()` lo descartaría) y `Usuario.Controller` nuevo/editar/actual.
2. **`middlewares/verificarRol.ts`**: selecciona el modo y deja `res.locals.alcance = { modo, usuarioId, proyectos }`;
   con rol ADMINISTRADOR el modo es `general`.
3. **`services/alcance.ts`** (nuevo, único lugar con la regla):
   - `aplicarAlcance(qb, alcance, aliasInventario)`: predicado `EXISTS` parametrizado.
     - Producción: operación con `proyectoId IN (…)` que sea entrada de compra o transformación (1, 15, 19) o el
       último movimiento con operación (`MAX(id)`, no `estatus`). Sin proyectos → `1=0`.
     - Usuario: movimiento cuya sesión es suya o donde figura en `operacion_usuarios_usuario`.
   - `exigirInventarioVisible` / `exigirMovimientoVisible` para accesos por id y SQL crudo.
4. **Aplicarlo** en todos los puntos que devuelven u operan productos:
   - `InventarioActual.Controller.ts`: `queryBusquedaCatalogo`, `queryBusquedaCodigos`, `queryBusquedaProyecto`,
     `fnQueryId`, `obtenerInventarioActualDeCodigo` (escaneo), `obtenerMovimientosInventario`, editar y borrar.
   - `Grupo.Controller.ts`: `funcionQueryListadoMovimientos`, pendientes, `create-list-from-*`, registrar,
     `activity-add-transaction` y deshacer.
   - `Movimiento.Controller.ts`, `MovimientoService.cadena/abiertosPorInventario`,
     `ProductoInventariado.Controller.ts`, `Producto.Controller.ts` (editar, comentarios), archivos de producto.
   - Reportes: `Reportes.Controller.ts` pasa `alcance` a `helpers/excelFunctions.ts`.
   - En modo producción, registrar o comprar exige `proyectoId` entre los proyectos del usuario.
5. **Front**: selector "Visibilidad" en `pages/administracion/usuarios/componentes/forma.tsx`. El resto no cambia:
   filtra el servidor.

### Pruebas

`alcance.int.test.ts` con dos usuarios restringidos en la semilla: catálogos filtrados, detalle por id 404, escaneo
400, deshacer denegado, producción sin proyectos ve vacío, visible por compra y por último movimiento (y deja de
verse al pasar a otra producción si no fue su compra), usuario como responsable y como registrador, administrador y
usuario general sin cambios. Unitaria del generador de predicados. Medir con `npm run rendimiento`.

## Bloque C · Transformación

1. **Migración**: `movimiento_tipo` 18 TRANSFORMACIÓN y 19 ALTA POR TRANSFORMACIÓN; `'transformacion'` en el enum
   de `movimiento_relacion.tipo`; vista con el 19; rol `GRUPOS-TRANSFORMAR`. También `semilla/catalogo.json` y `seed.ts`.
2. **`entity/common/MovimientoTipoId.ts`** y `RelacionTipo.ts`:
   - 18 se comporta como baja con proyecto por cantidad (clase REGRESO): descuenta del pendiente de la producción.
   - 19 se comporta como COMPRA (entrada y origen con saldo): el producto nuevo queda a cargo de la producción.
   - `tiposAdmitidosEnListado(18) = [18, 19]`; entradas en `INVENTARIADO`.
   - Si el original es expendable no hay pendiente que descontar; si el nuevo es expendable nace 0/0 sin pendiente.
3. **`MovimientoService.transformar`**, una sola transacción: `registrarOperacion(18)` sobre el original (bloquea);
   por cada producto nuevo crea producto, inventario (hereda área y bodega), precio tipo 2 y código (base +
   desplazamiento, para no repetir dentro de la transacción) y `registrarOperacion(19, manager)`; inserta las filas
   `transformacion` (origen = el 18, derivado = cada 19, cantidad del derivado). Reutiliza la creación de producto de
   `GrupoController.agregarMovimientoCompra`, extraída a una función común.
4. Ruta `PUT /groups/activity-transform` con esquema zod y alcance del bloque B. 18 y 19 se rechazan en
   `PUT /groups/activity`; `deshacer` responde 409 explícito para ambos.
5. **Front**: pantalla `pages/operaciones/9.transformaciones` (escanear original, cantidad usada, lista de productos
   nuevos con título, descripción, cantidad y tipo), entrada de menú y ruta; sección "Origen / Derivados" en
   `pages/catalogos/articulos/detalle` con `GET /activity/:id/chain`.

### Pruebas

Integración: transformación parcial con dos productos nuevos (existencias, relaciones, pendiente del 19), fallo en el
segundo no deja nada a medias, códigos distintos, 18/19 rechazados fuera del endpoint, deshacer 409, visibilidad del
derivado en modo producción. Front: formulario y sección de origen.

## Documentación

`docs/api/tipos-de-movimiento.md` (18, 19, bajas por cantidad, expendables), `docs/api/endpoints.md`,
`docs/api/modelo-de-datos.md`, `docs/hallazgos-codigo.md` si se corrige alguno, changelogs.

## Verificación

- `api/`: `npm run typecheck`, `npm run test:unit`, `npm run test:int` (falla si falta una migración).
- `front/`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Manual en staging local (`chronos-staging`) por bloque:
  - A: prestar 3 de 5, devolver 1, ver pendiente 2; prestar un expendable y comprobar que no aparece en préstamos
    activos; baja de 1 sobre 5.
  - B: usuario en modo producción y otro en modo usuario; comprobar catálogo, escaneo y reporte.
  - C: transformar 1 de 5 en dos productos y ver origen y derivados.

## Riesgos y despliegue

- Una baja de 1 sobre un artículo de varias unidades ya no lo cierra completo (cambio buscado; la pantalla muestra la
  existencia).
- Migraciones en producción las aplica una persona (`docs/api/procedimiento-migracion-produccion.md`): comprobar antes
  que `producto_tipo` 2 es CONSUMIBLE y que los ids 18 y 19 de `movimiento_tipo` están libres en cada cliente.
- API y front de cada bloque se publican juntos (un front viejo reescribiría el tipo de producto a 1 al editar).
- Limitación aceptada: los avisos de vencimiento pueden enlazar a un artículo que el destinatario ya no ve.
