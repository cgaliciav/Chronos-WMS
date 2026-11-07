# Plan 02 · API: relación explícita entre movimientos, transacciones y limpieza

> **Para quien ejecute este plan (Sonnet/Opus):** lee primero `api/CLAUDE.md`,
> `docs/api/modelo-de-datos.md`, `docs/api/tipos-de-movimiento.md` y `docs/hallazgos-codigo.md`.
> Ejecuta las fases en orden; cada una termina con pruebas verdes y un commit en una rama
> `api/fase-N-…`. Donde haya una decisión abierta (sección 7) usa la opción **(por defecto)**.
> **Nunca** ejecutes migraciones contra la base de producción desde este plan: las fases producen
> archivos de migración y un procedimiento; la ejecución en producción la hace una persona con respaldo.

## 1. Problema

`Movimiento` no tiene ninguna referencia al movimiento que le da origen. Una DEVOLUCIÓN (tipo 4),
una BAJA (5/13/16) o una TRANSFERENCIA ORIGEN (7) no saben a qué PRÉSTAMO (3), RENTA EXTERNA (11)
o TRANSFERENCIA DESTINO (12) corresponden. Hoy el sistema lo infiere con tres mecanismos frágiles
(detallados en `docs/api/modelo-de-datos.md`, sección "Cómo se encadenan hoy los movimientos"):
el `estatus` activo/inactivo como puntero al último movimiento, la suma por tipo y proyecto de
`aceptarDevolucionBaja`, y la pila `InventarioActualHistorico` por `idOriginal`.

Consecuencias observables:
- No se puede saber qué préstamo quedó parcialmente devuelto ni cuánto falta.
- Al deshacer (`quitar`) un movimiento que no es el último, se restaura una instantánea equivocada.
- Si dos usuarios registran a la vez sobre el mismo artículo, pueden quedar dos movimientos `activo`.
- Los reportes de "préstamos activos" (`funcionQueryListadoPrestamosPendientes`) dependen de
  `ia.disponible = 'no-disponible'` y de `ROW_NUMBER()` por producto, no de los movimientos.
- `Movimiento` no tiene fecha propia; se usa `operacion.fecha`, que no existe en movimientos sin operación.

## 2. Diseño propuesto

### 2.1 Cambios de esquema

```ts
// entity/Movimiento.ts (fragmento)
@CreateDateColumn() fecha: Date;                       // nuevo

@Index()
@ManyToOne(() => Movimiento, (m) => m.movimientosDerivados, { nullable: true, onDelete: "RESTRICT" })
movimientoOrigen: Movimiento | null;                   // nuevo: FK movimientoOrigenId

@OneToMany(() => Movimiento, (m) => m.movimientoOrigen)
movimientosDerivados: Movimiento[];                    // nuevo (inverso)

@Column({ type: "enum", enum: RelacionTipo, nullable: true })
relacionTipo: RelacionTipo | null;                     // nuevo: DEVOLUCION | BAJA | TRANSFERENCIA | CIERRE_INVENTARIO

@Column({ type: "numeric", precision: 15, scale: 4, transformer: numericTransformer })
cantidad: number;                                      // existente; se añade transformer string→number
```

```ts
// entity/InventarioActualHistorico.ts (fragmento)
@Index()
@ManyToOne(() => Movimiento, { nullable: true, onDelete: "SET NULL" })
movimiento: Movimiento | null;                         // nuevo: qué movimiento produjo esta instantánea
```

```ts
// entity/common/MovimientoTipoId.ts (nuevo)
export enum MovimientoTipoId {
  COMPRA_LEGADO = 1, ALTA_LEGADO = 2, PRESTAMO = 3, DEVOLUCION = 4, BAJA_LEGADO = 5,
  AJUSTE_INVENTARIO = 6, TRANSFERENCIA_ORIGEN = 7, BAJA_EN_INVENTARIO = 8, INVENTARIO = 9,
  AJUSTE_ADMINISTRADOR = 10, RENTA_EXTERNA = 11, TRANSFERENCIA_DESTINO = 12,
  BAJA_JUSTIFICADA = 13, ALTA = 14, COMPRA = 15, BAJA_INJUSTIFICADA = 16, BAJA_ADMINISTRADOR = 17,
}
export const TIPOS_ENTRADA   = [1, 2, 14, 15];          // crean saldo en almacén, sin origen
export const TIPOS_SALIDA    = [3, 11, 12];             // abren un saldo pendiente (origen de cadena)
export const TIPOS_REGRESO   = [4, 7, 13, 16, 5];       // consumen saldo de una salida del mismo proyecto
export const TIPOS_BAJA_LIBRE= [8, 17];                 // cierran el inventario sin proyecto
```

Reglas de negocio de la relación (**por defecto**, ver Q1):
1. Un movimiento de `TIPOS_REGRESO` **debe** apuntar a un `movimientoOrigen` de `TIPOS_SALIDA`
   del **mismo `inventarioActual`** y **mismo `proyecto`**, con **saldo pendiente > 0**.
2. `saldoPendiente(origen) = origen.cantidad − Σ cantidad(derivados de TIPOS_REGRESO)`. Se calcula,
   no se persiste (vista SQL `v_movimiento_saldo` para reportes; método en el servicio).
3. `derivado.cantidad ≤ saldoPendiente(origen)`. Permite devoluciones parciales (varias devoluciones
   → un préstamo). Una devolución **no** puede cubrir dos préstamos: se registran dos movimientos.
4. TRANSFERENCIA: el 7 (origen) apunta al préstamo/renta del proyecto A; el 12 (destino) apunta al
   movimiento 7 (no a un préstamo). Así la cadena es préstamo A → 7 → 12 → (devolución en B apunta al 12).
5. `TIPOS_BAJA_LIBRE` (8, 17) apuntan opcionalmente al último movimiento con operación del inventario
   (`relacionTipo = CIERRE_INVENTARIO`), solo para trazabilidad; no validan saldo.
6. Si el cliente no envía `movimientoOrigenId`, el servicio lo **resuelve automáticamente**: la salida
   más antigua con saldo > 0 del mismo inventario y proyecto (FIFO). Si hay más de una candidata con
   saldo y el API recibe `strict=true`, devuelve 409 con la lista de candidatas para que el front elija.
   Esto mantiene compatibilidad con el front actual, que no envía el origen.
7. `estatus` `activo/inactivo` se **mantiene** durante la transición (lo lee el front y varios listados)
   pero deja de ser la fuente de verdad: se recalcula a partir de la relación. Se marca `@deprecated`
   y se elimina en una fase posterior (fuera de este plan).

### 2.2 Transacciones

Todo caso de uso que toque `InventarioActual` + `InventarioActualHistorico` + `Movimiento` +
`Operacion` (+ `OperacionDetalle`, `ProductoInventariado`, `Grupo.movimientos`) se ejecuta dentro de
**una** transacción con `SELECT … FOR UPDATE` sobre la fila de `inventario_actual`
(`queryBuilder.setLock("pessimistic_write")`), lo que elimina la carrera de dos movimientos `activo`.

### 2.3 Capa de servicios

Los controladores pasan a ser delgados (parsear request, llamar servicio, responder). La lógica se
mueve a `src/services/`:

```
src/services/
  MovimientoService.ts        registrarOperacion(), registrarCompra(), agregarOperacion(), deshacer(), resolverOrigen(), saldoPendiente()
  InventarioService.ts        aplicarEfecto(tipo, inventario, cantidad)  (sustituye el switch de actualizarInventarioActual)
  OperacionService.ts
  GrupoService.ts
  reglas/efectosInventario.ts tabla tipo → función pura (sin DB) que recibe {cantidad, cantidadAlmacen, disponible} y devuelve el nuevo estado o lanza AppError
```

`efectosInventario.ts` es **puro** (sin TypeORM) para poder probarlo exhaustivamente con Jest sin base de datos.

## 3. Fases

### Fase 0 · Entorno de pruebas reproducible

**Objetivo:** poder ejecutar pruebas unitarias y de integración (MariaDB real) en local y CI.

1. `api/docker-compose.test.yml`: servicio `mariadb:10.11` (LTS; 10.4 está fuera de soporte) con
   `MYSQL_DATABASE=almacen_test`, puerto `3307`, `healthcheck`.
2. `api/.env.test` (versionado, sin secretos reales): `DB_HOST=127.0.0.1 DB_PORT=3307 DB_DATABASE_NAME=almacen_test DB_SYNCRO=true DB_LOGGING=error JWTSECRET=test SALT_ROUNDS=4`.
3. Dependencias dev: `jest@30` (o mantener 29), `ts-jest`, `supertest`, `@types/supertest`,
   `mysql2` (reemplaza `mysql`, que está abandonado; TypeORM lo soporta con `type: "mariadb"`).
4. `src/test/`:
   - `dataSource.test.ts` → crea la conexión de pruebas (hoy `createConnection` de 0.2; en la fase 6 pasa a `DataSource`).
   - `seed.ts` → inserta los 17 `MovimientoTipo` con sus ids fijos (`INSERT … ON DUPLICATE KEY UPDATE`),
     2 `Rol` (`ADMINISTRADOR`, `GRUPOS-MOVIMIENTONUEVO`), 1 `Usuario` admin, 1 `Sesion`, 1 `Area`,
     1 `Bodega`, 2 `Proyecto`, 1 `Proveedor`, 1 `FacturaTipo`, 1 `PrecioTipo`, 1 `ProductoTipo`.
   - `factories.ts` → `crearProductoConInventario({cantidad, bodega})`, `tokenPara(usuario, sesion)`.
   - `app.ts` → exporta la `express()` sin `listen` (extraer de `src/index.ts`; `index.ts` solo arranca).
5. `jest.config.js`: dos proyectos: `unit` (`**/*.test.ts`, sin DB) e `integration`
   (`**/*.int.test.ts`, `globalSetup` que espera a MariaDB y `synchronize`, `maxWorkers: 1`).
   Scripts: `test`, `test:unit`, `test:int`, `test:int:up` (`docker compose -f docker-compose.test.yml up -d`).
6. Arreglar los dos tests existentes: `Grupo.Controller.test.ts` mockea `./InventarioActual.Controller`
   como objeto plano y el módulo exporta una **clase por defecto** (el mock debe ser `{ __esModule: true, default: { obtenerInventarioActualDeCodigo: jest.fn() } }`) y no mockea `res.json`; `Archivo.Controller.test.ts` es un placeholder: sustituir por una prueba real o borrarlo.
7. `.github/workflows/api.yml`: `services: mariadb`, `npm ci`, `npm run test:unit`, `npm run test:int`, `npx tsc --noEmit`.

**Aceptación:** `npm run test:unit` y `npm run test:int` verdes en local y CI; `tsc --noEmit` sin errores.

### Fase 1 · Pruebas de caracterización del comportamiento actual

**Objetivo:** congelar lo que hace hoy el sistema antes de tocarlo (los cambios posteriores deben
mantener estos escenarios verdes o modificarlos **a sabiendas**).

Pruebas de integración (`src/services/__tests__/caracterizacion.int.test.ts`) vía HTTP con `supertest`:
1. Compra (`POST /groups/new-purchase` + `PUT /groups/activity-purchase` tipo 15, cantidad 5) →
   inventario `cantidadAlmacen=5, cantidad=0, disponible=no-disponible`; existe `OperacionDetalle`.
2. Alta (tipo 14, cantidad 3) → `cantidadAlmacen=3, cantidad=3, disponible`.
3. Préstamo (tipo 3, cantidad 2) sobre inventario con `cantidad=3` → `cantidad=1`; devolución (tipo 4,
   cantidad 2) → `cantidad=3`; devolución extra → 400.
4. Devolución en proyecto distinto al del préstamo → 401/400 (mensaje "no pertenece al proyecto").
5. Préstamo sin existencia → 400.
6. `DELETE /groups/activity` del último movimiento → inventario restaurado; del penúltimo →
   **documentar el resultado actual** (se espera incorrecto; la prueba se marca `it.failing` o
   `todo` y se corrige en fase 3).
7. Dos préstamos concurrentes (`Promise.all` de dos POST) sobre `cantidad=1` → documentar (hoy puede
   dejar `cantidad=-1` o dos `activo`); `it.failing`.
8. Listado `POST /groups/active-activity-list` devuelve el préstamo activo.
9. Edición de grupo compra (`PUT /groups/edit-purchase`) actualiza proyecto en las operaciones de todos sus movimientos (hoy `forEach(async)` sin `await`: la prueba debe **esperar** con `waitFor` y documentar la carrera).

**Aceptación:** suite verde con los `failing` explícitos; commit.

### Fase 2 · Correcciones de seguridad y errores evidentes (sin cambiar el modelo)

Corregir los hallazgos **críticos/altos** de `docs/hallazgos-codigo.md` que no dependen del nuevo modelo:
1. **Inyección SQL**: parametrizar `condicionesWhereAnd*` (`Grupo.Controller.ts`, `InventarioActual.Controller.ts`, `Usuario.Controller.ts`, etc.) construyendo `Brackets` con parámetros nombrados (`qb.andWhere("x.nombre LIKE :p0", { p0: "%…%" })`); lista blanca de columnas ordenables/filtrables por listado (`const CAMPOS_PERMITIDOS = {...}`); `obtenerInventarioActualDeCodigo` con `LIKE :codigo`; `funcionQueryListadoPrestamosPendientes` con `IN (:...ids)`.
2. **Promesas sin `await`**: `GrupoController.quitarMovimiento` (`MovimientoController.quitar`), `MovimientoController.obtenerGrupo` (`res.json(getRepository…)` sin `await` y parámetro `:movimientoId` vs `{ id }`), `editarConCompra`/`editarConDetalle` (`forEach(async)` → `for…of` con `await`), `CommonController.quitarComentario` (`remove` sin await), suscriptor `nuevaOperacion` (al menos capturar el rechazo).
3. **Numéricos como string**: `numericTransformer` (`from: v => v === null ? null : Number(v)`, `to: v => v`) en todas las columnas `numeric` (`Movimiento.cantidad`, `InventarioActual.cantidad/cantidadAlmacen`, `InventarioActualHistorico.*`, `OperacionDetalle.*`, `FacturaDetalle.*`, `ProductoPrecio.precio`, `OperacionPrecio.precio`); eliminar los `Number.parseFloat(x + " ")` y los `+=` sobre strings.
4. `nuevoConInventario`: `mov.cantidad;` no asigna nada → `mov.cantidad = iac.cantidad`; filtrar por `bodegaId` (hoy toma todas las bodegas). **Confirmar con Q5.**
5. `CommonController.listaSimpleGenerica`: `where: { st }` → `{ estatus }`.
6. `CommonController.quitarArchivo`: `arch.id !== fileId` compara número con string → `Number(fileId)`.
7. `checkJwt`: envía el token viejo en la cabecera `t` (`res.setHeader("t", token)`) en vez de `newToken`; decidir si se renueva (12 h en login, 90 d en renovación: **unificar**, ver Q6) y enviar el correcto.
8. `pasada.ts`: `headers["x-forwarded-for'"]` (comilla extra).
9. `index.ts`: el handler `process.on("exit")` es `async` y llama `process.exit` (recursivo); dejar solo SIGTERM/SIGINT con cierre ordenado.
10. `ProductoPrecio.producto` declara el inverso equivocado (`producto.productoCaracteristicas`) → `producto.productoPrecios`.
11. `Operacion.Controller.quitar`: `operacion.operacionDetalle` puede venir sin cargar → cargar relación antes de borrar.
12. `TypeORM 0.2`: `findOne(undefined)`/`findOneOrFail(undefined)` devuelve la **primera fila**. Añadir guardas (`if (id == null) throw new AppError(..., 400)`) en `crearBaseOperacion`, `ProductoInventariadoController.guardar`, `nuevaOperacion` (suscriptor), `CommonController.editar`.
13. `deploy.sh`: `--exclude ".git/"--rsync-path` sin espacio.

**Pruebas:** unitarias para `numericTransformer`, para los constructores de `where` (entrada maliciosa
`"1' OR '1'='1"` produce consulta parametrizada), y las de caracterización siguen verdes (las de
`quitar`/concurrencia pueden pasar de `failing` a verde si la corrección 2 ya basta; si pasan,
quitar el `failing`).

### Fase 3 · Nuevo modelo: relación origen ↔ derivado, fecha e histórico ligado

1. **Migraciones en vez de `synchronize`**: añadir `src/migration/`, `migration:generate`/`migration:run`
   en `package.json` (TypeORM 0.2: `ts-node ./node_modules/typeorm/cli.js migration:generate -n …`),
   `DB_SYNCRO=false` en `.env.example` y `Dockerfile`. Primera migración `0001-baseline` generada
   contra una BD creada con `synchronize` (debe salir **vacía**: prueba de que el esquema coincide).
2. Migración `0002-movimiento-relacion`: columnas `movimiento.fecha` (default `CURRENT_TIMESTAMP(6)`),
   `movimiento.movimientoOrigenId` (FK → `movimiento.id`, `ON DELETE RESTRICT`), `movimiento.relacionTipo`,
   `inventario_actual_historico.movimientoId` (FK `ON DELETE SET NULL`), índices.
3. Entidades: aplicar los fragmentos de §2.1 y crear `MovimientoTipoId.ts`.
4. `MovimientoService.resolverOrigen(inventarioActualId, proyectoId, tipo, cantidad, origenIdOpcional)`:
   consulta las salidas con saldo > 0 (subconsulta `SUM` de derivados), FIFO; valida reglas 1-5 de §2.1.
5. `MovimientoService.registrarOperacion(...)` en transacción:
   `FOR UPDATE` inventario → `efectosInventario` → guardar histórico **con `movimiento`** → guardar
   operación → guardar movimiento (`movimientoOrigen`, `relacionTipo`, `fecha`) → actualizar `estatus`
   de la cadena → `ProductoInventariado` → añadir al grupo. Sustituye `guardarConOperacion`,
   `guardarConOperacionCompra`, `agregarOperacion` y el `switch` de `actualizarInventarioActual`.
6. `MovimientoService.deshacer(movimientoId)`: solo permite deshacer si **no tiene derivados**
   (409 en caso contrario, con la lista); restaura la instantánea **ligada a ese movimiento**
   (no la última); reactiva el origen si corresponde; todo en transacción.
7. Endpoints nuevos (`routes/movimientos.Routes.ts`), roles entre paréntesis:
   - `GET /activity/:id/chain` (`MOVIMIENTO-DETALLE`) → origen, derivados, saldo pendiente.
   - `GET /activity/open-by-inventory/:inventarioActualId?proyectoId=` (`MOVIMIENTO-HISTORIAL`) → salidas con saldo (candidatas a origen).
   - `PUT /groups/activity` y `PUT /groups/activity-add-transaction` aceptan `movimientoOrigenId` opcional y `strict` opcional.
8. Reescribir `aceptarDevolucionBaja` y `funcionQueryListadoPrestamosPendientes` sobre la relación
   (saldo > 0) en vez de `disponible='no-disponible'`/`ROW_NUMBER`.
9. **Backfill** `0003-backfill-relacion` (migración de datos, idempotente, con `--dry-run` que solo
   reporta): por cada `inventario_actual`, recorrer movimientos con operación ordenados por
   `operacion.fecha, movimiento.id`; mantener por proyecto la lista de salidas abiertas; cada regreso
   consume FIFO; 12 se liga al 7 inmediatamente anterior del mismo inventario (preferir el mismo grupo).
   Casos sin candidato o con exceso de cantidad se registran en `tabla migracion_relacion_pendiente`
   (inventarioActualId, movimientoId, motivo) y **no** detienen la migración. `movimiento.fecha` se
   rellena con `operacion.fecha` o, si no hay operación, con `grupo.fecha`.
10. `convertMovementType`/exportador Supabase: incluir `movimientoOrigenId` si se sigue usando (Q7).

**Pruebas:**
- Unitarias (`efectosInventario.test.ts`): tabla de casos por tipo (17 tipos × estados: disponible,
  sin existencia, baja, cantidad > existencia, cantidad ≤ 0) — 100 % de ramas.
- Unitarias (`resolverOrigen.test.ts` con repositorios en memoria/mocks): FIFO, saldo parcial,
  proyecto distinto, 12→7, candidatas múltiples con `strict`.
- Integración: préstamo 5 → devoluciones 2 + 3 → saldo 0 → tercera devolución 409/400; transferencia
  A→B→devolución en B; deshacer con derivados → 409; deshacer penúltimo ya no corrompe inventario
  (la prueba `failing` de fase 1 pasa a verde); dos préstamos concurrentes sobre `cantidad=1` → uno
  200 y otro 400, inventario `cantidad=0` (verde); backfill sobre un dataset sintético de 30
  movimientos reproduce las relaciones esperadas y deja 2 casos en la tabla de pendientes.
- `migration:generate` tras aplicar las migraciones no genera cambios (esquema sincronizado).

**Aceptación:** suite completa verde; `DB_SYNCRO=false` en todos los entornos; documento
`docs/api/procedimiento-migracion-produccion.md` (respaldo `mariadb-dump`, `migration:run`, backfill
`--dry-run`, revisión de pendientes, backfill real, verificación con consultas de control).

### Fase 4 · Limpieza y optimización del código

1. Borrar `src/entity-old/` (verificar que solo lo importa `Grupo.Controller.ts` como código muerto),
   `src/excel.ts` si no se referencia, imports muertos (`setSourceMapRange`, `isJSDocReadonlyTag`,
   `register` de ts-node en `manejoErrores.ts`, `indexOf` de lodash en `ProductoCaracteristica.ts`),
   bloques comentados > 20 líneas, `console.log` → logger `pino` con nivel por `LOG_CONSOLE_VERBOSE`.
2. `package.json`: mover `@types/*`, `typescript`, `ts-node`, `ts-node-dev` a `devDependencies`;
   eliminar `request`, `request-promise`, `request-stats` (sustituir el log de peticiones por
   `pino-http` o `morgan`), `@sentry/tracing`, `express-prom-bundle`/`prom-client`,
   `@supabase/supabase-js`, `@magicbell/core`, `password-generator`/`randomstring`, `lodash`, `moment`
   **si no se usan** (confirmar con grep; ver `docs/hallazgos-codigo.md`). `body-parser` → `express.json()`.
3. Sustituir magic numbers por `MovimientoTipoId` en todo `src` (`grep -n "== 15\|=== 3\|case 1[0-9]"`).
4. Unificar los tres patrones de controlador (`new Promise`, `.then`, `async/await`) en `async/await`
   con un wrapper `asyncHandler(fn)` que haga `next(error)` (o Express 5, que lo hace solo; ver fase 5).
5. Eliminar `eager: true` de las relaciones pesadas (`Producto.*`, `Sesion.usuario`, `Grupo.sesion`) y
   cargar explícitamente en cada consulta; medir con `maxQueryExecutionTime` antes/después en los
   listados `list-antd` (objetivo: reducir el número de consultas por petición a < 10 en `GET /activity/:id`).
6. Renombrar archivos con typos manteniendo exports (`ProductoCaractetistica.Controller.ts` →
   `ProductoCaracteristica.Controller.ts`, `InventarioAcutalHistorico.ts` → `InventarioActualHistorico.ts`,
   `LogPeticiones.Controllers.ts` → `LogPeticiones.Controller.ts`), con `git mv` y actualización de imports.
7. `tsconfig.json`: `"strict": true` progresivo (`noImplicitAny` primero, `strictNullChecks` por carpeta),
   `target: ES2022`, `skipLibCheck`.
8. `Dockerfile`: `node:24-alpine`, build multi-stage (`tsc` → `node build/index.js`), usuario no root,
   `.nvmrc` = 24, script `start` = `node build/index.js` (no `ts-node` en producción).

**Pruebas:** toda la suite; `tsc --noEmit`; `npm audit --omit=dev` sin críticas; comparación de
tiempos de los 5 endpoints más usados antes/después (`autocannon` o `k6`, 30 s, documentar en
`docs/api/rendimiento.md`).

### Fase 5 · Actualización de dependencias de runtime

| Paquete | Actual | Objetivo | Nota |
|---|---|---|---|
| node | 14 (Docker) / README dice 12 | 24 LTS | TypeORM 1.x exige ≥ 20.19. |
| express | 4.17 | 5.3 | Manejo nativo de promesas rechazadas en handlers; `req.query` ya no es escribible; rutas con `:id([0-9]+)` → `:id` + validación o `path-to-regexp` v8 sintaxis `{/:id}`; revisar `router.get("/:id([0-9]+)")` (23 archivos de rutas). |
| helmet | 5 | 8 | Config por defecto más estricta (CSP): verificar que el front sirve imágenes `blob:`/`data:`. |
| jsonwebtoken | 8.5 | 9 | Exige `algorithms` explícitos en `verify`; secretos ≥ 32 bytes. |
| bcryptjs | 2.4 | 3 | API igual; ESM+CJS. |
| multer | 1.4 | 2.5 | 1.x tiene CVEs; API igual. |
| sharp | 0.30 | 0.35 | Binarios prebuilt para Node 24. |
| class-validator | 0.13 | 0.15 | `forbidUnknownValues` por defecto `true` → validar DTOs explícitos. |
| exceljs, nodemailer, cors, typescript 5.9 | | últimas | TypeScript 7 (puerto nativo) solo cuando TypeORM confirme compatibilidad de decoradores. |

**Pruebas:** suite completa + prueba de humo de subida de archivo (`POST /item/file`) y de Excel (`/reports/*`).

### Fase 6 · TypeORM 0.2 → 1.x (opcional, recomendado; ver Q4)

1. `src/data-source.ts` con `new DataSource({...})`; `AppDataSource.initialize()` en `index.ts`;
   eliminar `conexionORM.ts`/`ormconfig.js`/`createConnections`.
2. Reemplazos mecánicos (codemod + revisión): `getRepository(X)` → `AppDataSource.getRepository(X)`
   (o inyectar `EntityManager` en servicios para transacciones); `findOne(id)` → `findOneBy({ id })`;
   `findOneOrFail(id, { relations: [...] })` → `findOneOrFail({ where: { id }, relations: { a: true } })`;
   `findByIds(ids)` → `findBy({ id: In(ids) })`; `loadEagerRelations` igual; `getConnection()` → `AppDataSource`;
   suscriptor: `event.connection` → `event.manager`.
3. CLI: `typeorm-ts-node-commonjs migration:generate src/migration/Nombre -d src/data-source.ts`.
4. Driver `mysql2`.

**Pruebas:** la suite completa es la prueba de regresión; además `migration:generate` vacío.

## 4. Orden y dependencias

```
F0 entorno de pruebas ─▶ F1 caracterización ─▶ F2 correcciones ─▶ F3 modelo + backfill ─▶ F4 limpieza ─▶ F5 deps ─▶ F6 TypeORM 1.x
```
F2 puede intercalarse con F3 si el ejecutor lo prefiere, pero las pruebas de F1 deben existir antes de
cualquier cambio de comportamiento.

## 5. Cambios de contrato con el front (coordinar con plan 01)

- `PUT /groups/activity` y `PUT /groups/activity-add-transaction`: nuevos campos opcionales
  `movimientoOrigenId`, `strict`; nuevo error 409 `{ code, message, candidatas: [...] }`.
- `GET /activity/:id` incluye `fecha`, `movimientoOrigen {id, cantidad, operacion.movimientoTipo, operacion.proyecto}`,
  `movimientosDerivados[]`, `saldoPendiente`.
- `DELETE /groups/activity` puede devolver 409 si el movimiento tiene derivados.
- Pantalla `operaciones/movimiento/detalle` del front: mostrar la cadena (origen/derivados/saldo).
- Formularios de devolución/baja/transferencia: selector opcional de origen cuando hay varias candidatas.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Backfill ambiguo en datos históricos | `--dry-run`, tabla de pendientes, no bloquear; revisión manual con consultas de control. |
| `synchronize: true` en producción borra/crea columnas sin control | Fase 3 paso 1 lo desactiva **antes** de añadir columnas; baseline vacía demuestra paridad. |
| Front depende de `estatus` activo/inactivo | Se mantiene y se recalcula; retiro en fase posterior. |
| Bloqueo pesimista en MariaDB con `eager` masivo | Cargar `inventario_actual` con `FOR UPDATE` solo por `id`, sin relaciones; el resto fuera del lock. |
| Express 5 cambia sintaxis de rutas | Pruebas de integración por ruta (fase 0 crea `rutas.int.test.ts` que recorre todas las rutas con token admin y espera ≠ 404). |

## 7. Dudas abiertas

- **Q1** ¿Una devolución puede cubrir **varios préstamos** a la vez (N:M)? Por defecto no: 1 origen por
  movimiento derivado; si se necesita N:M se crea tabla `movimiento_relacion (origenId, derivadoId, cantidad)`.
- **Q2** Resolución automática de origen: ¿FIFO (más antiguo primero) o LIFO (más reciente)? Por defecto FIFO.
- **Q3** ¿Se hace **backfill** del histórico o solo se relacionan movimientos nuevos? Por defecto backfill con dry-run.
- **Q4** ¿Incluir la migración a **TypeORM 1.x** (fase 6) en este esfuerzo o dejarla para después?
- **Q5** `nuevoConInventario` toma inventarios de **todas** las bodegas aunque el grupo tiene `bodegaId`: ¿es intencional?
- **Q6** Duración del JWT: login 12 h, renovación 90 d y hoy no se renueva. ¿Cuál debe ser?
- **Q7** ¿Siguen en uso **Supabase** (`export2supabase`), **MagicBell** y **Sentry** en el API? Si no, se eliminan.
- **Q8** ¿Existe respaldo reciente de la BD de producción y una copia en MariaDB ≥ 10.11 para ensayar el backfill?
- **Q9** Tipos 6, 9 y 10 no tienen efecto en inventario hoy. ¿Deben tenerlo?
