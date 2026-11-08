# Plan 02 · API: relación explícita entre movimientos, transacciones, limpieza y notificaciones propias

> **Para quien ejecute este plan (Sonnet/Opus):** lee primero `api/CLAUDE.md`,
> `docs/api/modelo-de-datos.md`, `docs/api/tipos-de-movimiento.md`, `docs/hallazgos-codigo.md` y
> `docs/decisiones.md` (las decisiones ya están tomadas; no las reabras). Ejecuta las fases en orden;
> cada una termina con pruebas verdes y un commit en una rama `api/fase-N-…`.
> **Nunca** ejecutes migraciones contra la base de producción desde este plan: las fases producen
> archivos de migración y un procedimiento; la ejecución en producción la hace una persona con respaldo.

## 1. Problema

`Movimiento` no tiene ninguna referencia al movimiento que le da origen. Una DEVOLUCIÓN (tipo 4),
una BAJA (5/13/16) o una TRANSFERENCIA ORIGEN (7) no saben a qué PRÉSTAMO (3), RENTA EXTERNA (11)
o TRANSFERENCIA DESTINO (12) corresponden. Hoy el sistema lo infiere con tres mecanismos frágiles
(detallados en `docs/api/modelo-de-datos.md`): el `estatus` activo/inactivo como puntero al último
movimiento, la suma por tipo y proyecto de `aceptarDevolucionBaja`, y la pila `InventarioActualHistorico`
por `idOriginal`.

Consecuencias observables:
- No se puede saber qué préstamo quedó parcialmente devuelto ni cuánto falta.
- Al deshacer (`quitar`) un movimiento que no es el último, se restaura una instantánea equivocada.
- Dos usuarios registrando a la vez sobre el mismo artículo pueden dejar dos movimientos `activo` o existencia negativa.
- Los reportes de "préstamos activos" dependen de `ia.disponible = 'no-disponible'` y `ROW_NUMBER()`, no de los movimientos.
- `Movimiento` no tiene fecha propia.

## 2. Diseño

### 2.1 Relación N:M `MovimientoRelacion` (decisión: una devolución puede cubrir varios préstamos)

```ts
// entity/MovimientoRelacion.ts (nuevo)
export enum RelacionTipo { DEVOLUCION = "devolucion", BAJA = "baja", TRANSFERENCIA = "transferencia", CIERRE_INVENTARIO = "cierre-inventario" }

@Entity()
@Unique(["origen", "derivado"])
export class MovimientoRelacion {
  sesionId: number;
  @PrimaryGeneratedColumn() id: number;
  @Index() @ManyToOne(() => Movimiento, (m) => m.relacionesComoOrigen,   { nullable: false, onDelete: "RESTRICT" }) origen: Movimiento;   // la salida (3, 11, 12)
  @Index() @ManyToOne(() => Movimiento, (m) => m.relacionesComoDerivado, { nullable: false, onDelete: "CASCADE"  }) derivado: Movimiento; // el regreso (4, 7, 13, 16, 5) o baja libre (8, 17)
  @Column({ type: "numeric", precision: 15, scale: 4, transformer: numericTransformer }) cantidad: number; // cuánto del derivado se aplica a este origen
  @Column({ type: "enum", enum: RelacionTipo }) tipo: RelacionTipo;
  @CreateDateColumn() fecha: Date;
}
```

```ts
// entity/Movimiento.ts (fragmento añadido)
@CreateDateColumn() fecha: Date;                                                   // nuevo
@OneToMany(() => MovimientoRelacion, (r) => r.origen)   relacionesComoOrigen: MovimientoRelacion[];
@OneToMany(() => MovimientoRelacion, (r) => r.derivado) relacionesComoDerivado: MovimientoRelacion[];
@Column({ type: "numeric", precision: 15, scale: 4, transformer: numericTransformer }) cantidad: number; // + transformer
```

```ts
// entity/InventarioActualHistorico.ts (fragmento añadido)
@Index() @ManyToOne(() => Movimiento, { nullable: true, onDelete: "SET NULL" }) movimiento: Movimiento | null; // qué movimiento produjo la instantánea
```

```ts
// entity/common/MovimientoTipoId.ts (nuevo)
export enum MovimientoTipoId { COMPRA_LEGADO = 1, ALTA_LEGADO = 2, PRESTAMO = 3, DEVOLUCION = 4, BAJA_LEGADO = 5,
  AJUSTE_INVENTARIO = 6, TRANSFERENCIA_ORIGEN = 7, BAJA_EN_INVENTARIO = 8, INVENTARIO = 9, AJUSTE_ADMINISTRADOR = 10,
  RENTA_EXTERNA = 11, TRANSFERENCIA_DESTINO = 12, BAJA_JUSTIFICADA = 13, ALTA = 14, COMPRA = 15, BAJA_INJUSTIFICADA = 16, BAJA_ADMINISTRADOR = 17 }
export const TIPOS_ENTRADA    = [1, 2, 14, 15];   // crean saldo en almacén; nunca son derivados
export const TIPOS_SALIDA     = [3, 11, 12];      // abren saldo pendiente (origen)
export const TIPOS_REGRESO    = [4, 7, 13, 16, 5];// consumen saldo (derivado)
export const TIPOS_BAJA_LIBRE = [8, 17];          // cierran el inventario sin proyecto
```

Reglas de negocio:
1. Un movimiento de `TIPOS_REGRESO` tiene **una o más** filas en `movimiento_relacion` como `derivado`,
   cada una contra un `origen` de `TIPOS_SALIDA` del **mismo `inventarioActual`** y **mismo `proyecto`**
   con saldo pendiente > 0. `Σ relacion.cantidad == derivado.cantidad`.
2. `saldoPendiente(origen) = origen.cantidad − Σ relacion.cantidad (donde origen = este movimiento)`.
   Se calcula (método del servicio + vista SQL `v_movimiento_saldo` para reportes); no se persiste.
3. `relacion.cantidad ≤ saldoPendiente(origen)` en el momento de crearla (bajo bloqueo, §2.2).
4. TRANSFERENCIA: el 7 (origen) se relaciona como derivado de los préstamos/rentas del proyecto A; el 12
   (destino) se relaciona como derivado del 7 con `tipo = TRANSFERENCIA`. Cadena: préstamo A → 7 → 12 → (devolución en B contra el 12).
5. `TIPOS_BAJA_LIBRE` (8, 17): relación opcional `CIERRE_INVENTARIO` contra las salidas abiertas del
   inventario (todas, por el saldo completo), solo para trazabilidad.
6. **Resolución automática**: si el cliente no envía `relaciones: [{ origenId, cantidad }]`, el servicio
   reparte `cantidad` entre las salidas abiertas del mismo inventario y proyecto por orden **FIFO**
   (más antigua primero), generando tantas filas como haga falta. Con `strict=true` y más de una salida
   candidata responde `409 { code, message, candidatas: [{ movimientoId, fecha, cantidad, saldo }] }`
   para que el front elija. Compatible con el front actual, que no envía origen.
7. `estatus` `activo/inactivo` se **mantiene** (lo lee el front) pero se recalcula desde la relación y
   se marca `@deprecated`; su retiro queda fuera de este plan.
8. **No hay backfill** de movimientos históricos (decisión): los movimientos anteriores a la migración
   quedan sin relaciones. `aceptarDevolucionBaja` conserva un **modo de compatibilidad**: si el
   inventario no tiene ninguna salida abierta con relaciones, cae a la suma por tipo actual (heurística
   heredada) y lo registra en el log con nivel `warn`. Así las devoluciones de préstamos antiguos siguen funcionando.

### 2.2 Transacciones

Todo caso de uso que toque `InventarioActual` + `InventarioActualHistorico` + `Movimiento` +
`MovimientoRelacion` + `Operacion` (+ `OperacionDetalle`, `ProductoInventariado`, tabla puente de `Grupo`)
se ejecuta en **una** transacción con `SELECT … FOR UPDATE` sobre `inventario_actual` por `id`
(`qb.setLock("pessimistic_write")`, sin relaciones eager dentro del lock).

### 2.3 Capa de servicios

```
src/services/
  MovimientoService.ts        registrarOperacion(), registrarCompra(), agregarOperacion(), deshacer(), resolverRelaciones(), saldoPendiente(), cadena()
  InventarioService.ts        aplicarEfecto(tipo, inventario, cantidad) → usa reglas/efectosInventario
  OperacionService.ts, GrupoService.ts, NotificacionService.ts (fase 7)
  reglas/efectosInventario.ts tabla tipo → función pura {cantidad, cantidadAlmacen, disponible} → nuevo estado | AppError (sin TypeORM, 100 % testeable)
```
Los controladores quedan delgados: parsear y validar request (`zod`), llamar al servicio, responder.

## 3. Fases

### Fase 0 · Entorno de pruebas reproducible ✅ (hecha el 2026-11-07, commit d6034e6)

1. `api/docker-compose.test.yml`: `mariadb:10.11` (LTS; 10.4 está fuera de soporte) con
   `MYSQL_DATABASE=almacen_test`, puerto `3307`, `healthcheck`. Este mismo compose sirve de **API de pruebas**
   para los e2e del front (plan 01, fase 7), que hoy no existe.
2. `api/.env.test` versionado sin secretos reales: `DB_HOST=127.0.0.1 DB_PORT=3307 DB_DATABASE_NAME=almacen_test DB_SYNCRO=true DB_LOGGING=error JWTSECRET=solo-pruebas-0123456789abcdef SALT_ROUNDS=4`.
3. Dev deps: `jest@30`, `ts-jest`, `supertest`, `@types/supertest`; runtime: `mysql2` (reemplaza `mysql`, abandonado).
4. `src/test/`: `dataSource.test.ts` (conexión de pruebas), `seed.ts` (17 `MovimientoTipo` con ids fijos
   via `INSERT … ON DUPLICATE KEY UPDATE`, roles `ADMINISTRADOR` y los `GRUPOS-*` usados, usuario admin,
   sesión, área, bodega, 2 proyectos, proveedor, tipo de factura, tipo de precio, tipo de producto),
   `factories.ts` (`crearProductoConInventario`, `tokenPara`), `app.ts` (exporta `express()` sin `listen`;
   `index.ts` solo arranca).
5. `jest.config.js` con dos proyectos: `unit` (`*.test.ts`, sin DB) e `integration` (`*.int.test.ts`,
   `globalSetup` espera a MariaDB y sincroniza, `maxWorkers: 1`). Scripts `test`, `test:unit`, `test:int`,
   `test:int:up`.
6. Arreglar/sustituir los dos tests existentes (hallazgo L16).
7. `.github/workflows/api.yml`: servicio `mariadb`, `npm ci`, `npm run test:unit`, `npm run test:int`, `npx tsc --noEmit`.

**Aceptación:** `test:unit` y `test:int` verdes en local y CI; `tsc --noEmit` sin errores.

### Fase 1 · Pruebas de caracterización del comportamiento actual ✅ (hecha, commit 0bf97a9)

`src/services/__tests__/caracterizacion.int.test.ts` vía HTTP con `supertest`:
1. Compra (`POST /groups/new-purchase` + `PUT /groups/activity-purchase` tipo 15, cantidad 5) → `cantidadAlmacen=5, cantidad=0, no-disponible`; existe `OperacionDetalle`.
2. Alta (14, cantidad 3) → `3/3/disponible`.
3. Préstamo (3, 2) sobre `cantidad=3` → `1`; devolución (4, 2) → `3`; devolución extra → 400.
4. Devolución en proyecto distinto → 401/400.
5. Préstamo sin existencia → 400.
6. `DELETE /groups/activity` del último movimiento → inventario restaurado; del penúltimo → documentar (`it.failing`).
7. Dos préstamos concurrentes sobre `cantidad=1` → documentar (`it.failing`).
8. `POST /groups/active-activity-list` devuelve el préstamo activo.
9. `PUT /groups/edit-purchase` propaga proyecto a las operaciones (hoy `forEach(async)`; esperar con `waitFor` y documentar).
10. Login guarda `Sesion.IP` con el valor del body (comportamiento a cambiar en fase 2).

**Aceptación:** suite verde con los `failing` explícitos; commit.

### Fase 2 · Correcciones de seguridad y errores evidentes (sin cambiar el modelo) ✅ (hecha)

> Resultado: ver `docs/hallazgos-codigo.md` sección C y `docs/api/endpoints.md` ("Cambios de la fase 2").
> Se adelantaron de la fase 5: TypeScript 5.9 (zod 4 lo exige), `@types/node` 22 y `Dockerfile` en `node:22`
> (Sentry 11 exige Node ≥ 20). Pendientes de esta fase que pasan a la 3: revocación de sesión al hacer logout
> (requiere consultar `Sesion.fechaFin` en `checkJwt`), limpieza del caché de archivos (M17).

Hallazgos de `docs/hallazgos-codigo.md` (sección A) que no dependen del nuevo modelo:
1. **Inyección SQL** (C1-C3): parametrizar todos los `condicionesWhereAnd*` con `Brackets` y parámetros
   nombrados; lista blanca de columnas filtrables/ordenables por listado (M1); `obtenerInventarioActualDeCodigo`
   con `LIKE :codigo`; `IN (:...ids)` y guardas para arreglos vacíos (M11); `MATCH … AGAINST (:texto)`.
2. **Archivos** (C4, H1, H2, H4): restaurar `checkJwt` en todos los `GET /file/*`; en `obtenerReporte`
   usar `path.basename` + `res.sendFile(nombre, { root: RUTA_REPORTES })`; nombre de caché por `archivo.id`
   + extensión derivada de `tipoMIME`; `fs.promises` en vez de callbacks con `throw`; `borrar` responde y espera.
3. **Contraseñas** (C5): `renewpassword` no devuelve la contraseña; reactiva `EnviarMail.correoNuevoPassword`;
   `passGenerator` con `crypto.randomInt`.
4. **IP del cliente** (decisión): `app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback')` y
   `sesion.IP = req.ip` en `Auth.login`; se **ignora** `body.ip`. Documentar `TRUST_PROXY` en `.env.example`
   (en producción el valor es la IP/red del proxy inverso). Prueba: login con `X-Forwarded-For` desde
   proxy confiable registra esa IP; desde origen no confiable registra la del socket.
5. **Promesas sin `await`** (H4, H5, H7, H12, H13, H14, M9, M28, M31): corregir cada una; `forEach(async)` → `for…of`.
6. **Numéricos como string** (H18): `numericTransformer` en todas las columnas `numeric`; eliminar `Number.parseFloat(x + " ")` y los `+=` sobre strings.
7. **Asignación masiva** (H6): DTOs con `zod` por endpoint (`nuevoUsuarioSchema`, `editarInventarioSchema`…);
   `Common.nuevo/editar` reciben solo campos permitidos. `PUT /current-inventory/edit` deja de aceptar `cantidad`, `cantidadAlmacen`, `disponible`.
8. `getRepository(relacion)` desde body (H3): mapa cerrado `{ Grupo, Operacion, Producto, Proveedor, Proyecto, Usuario }`.
9. `nuevoConInventario` (H15): `mov.cantidad = iac.cantidad`. El filtro por `bodegaId` **se revisa sobre la
   marcha con el propietario** (hoy toma todas las bodegas): dejar prueba `it.todo` y hallazgo abierto.
10. Resto: `listaSimpleGenerica` `{ st }` → `{ estatus }` (M27); `quitarArchivo`/`quitarComentario` comparar
    con `Number()` (M8); `checkJwt` enviar `newToken` y unificar expiración a 12 h (H16; sin lista de
    revocación por ahora, documentado); `pasada.ts` comilla (M25); `process.on("exit")` (M24); `ProductoPrecio`
    inverso (M29); `Operacion.quitar` cargar `operacionDetalle` (M32); guardas `id == null` antes de `findOne`
    (M2); `InventarioDetalle` condición invertida (M6); `excelFunctions` `:bodegasIds` (H11); handlers vacíos
    (H9) responden `501 { message: "No implementado" }` en vez de colgar; `obtenerMovimientosInventario` lee
    `req.body.inventarioActualId` (H10); `deploy.sh` espacio (M20); rate limit en `/auth/login`
    (`express-rate-limit`, M3).
11. **Sentry preparado** (decisión): actualizar a `@sentry/node@11`; `src/sentry.ts` inicializa solo si
    `SENTRY_DSN` existe (`tracesSampleRate` desde env); `Sentry.setupExpressErrorHandler(app)` antes de
    `errorMiddlewere`; `environment` = `NODE_ENV`; `release` = `version` de `package.json`. Eliminar `@sentry/tracing`.

**Pruebas:** unitarias para `numericTransformer`, constructores de `where` (entrada `"1' OR '1'='1"`
produce consulta parametrizada), `path.basename` en reportes (`..%2F` → 404), DTOs zod (campos extra se
rechazan con 400); integración: `GET /file/:id` sin token → 401; login registra `req.ip`; `renewpassword`
no incluye `c` en la respuesta. Las de caracterización siguen verdes (10 cambia a propósito).

### Fase 3 · Nuevo modelo: `MovimientoRelacion`, fecha, histórico ligado, migraciones ✅ (hecha el 2026-11-07)

> **Resultado:** criterios de aceptación cumplidos (suite unitaria y de integración en verde, `DB_SYNCRO=false` en
> todos los entornos, procedimiento en `docs/api/procedimiento-migracion-produccion.md`). Código en
> `api/src/migration/`, `api/src/services/` (`MovimientoService`, `reglas/efectosInventario.ts`,
> `reglas/planificarRelaciones.ts`, `guardasRelacion.ts`) y `api/src/entity/` (`MovimientoRelacion`,
> `common/MovimientoTipoId.ts`). Pruebas en `src/test/relaciones.int.test.ts`, `src/services/*.test.ts` y
> `src/services/reglas/*.test.ts` (no en `src/services/__tests__/`, para seguir la convención de la fase 0).
> Contrato con el front: `docs/api/endpoints.md` ("Cambios de la fase 3").
>
> **Desviaciones respecto de lo escrito abajo (decididas al implementar):**
> - Columna `movimiento.legado` (no prevista): la migración marca con `1` todo lo existente. Sin ella no se puede
>   distinguir una salida antigua (sin relaciones porque no hubo backfill) de una nueva sin devoluciones, y la regla 8
>   necesita esa distinción. La vista y el listado de pendientes excluyen los legados; el modo de compatibilidad usa
>   la heurística anterior solo sobre ellos (y sobre la parte no relacionada de los regresos nuevos).
> - La **COMPRA (15) es origen** (`TIPOS_ORIGEN = [3, 11, 12, 15]`): el artículo comprado queda en el proyecto
>   (`cantidad 0`) hasta su primera devolución, como ya asumía `aceptarDevolucionBaja`. Sin esto, la primera
>   devolución de cada compra caería siempre en el modo de compatibilidad.
> - `deshacer` no restaura siempre la instantánea: salidas, regresos y altas se revierten con su **efecto inverso**
>   (restaurar la instantánea de un movimiento que no es el último sigue siendo incorrecto); compras y bajas, que fijan
>   valores absolutos, restauran su instantánea ligada y solo si son el último movimiento.
> - Baseline: la migración inicial contiene el esquema completo pero es **idempotente** (no hace nada si `movimiento`
>   existe). Así sirve para crear la BD de pruebas y queda vacía en producción. La paridad se verificó una vez y cada
>   `npm run test:int` comprueba que las migraciones reproducen las entidades.
> - El 401 por "proyecto distinto" pasa a 400 (el front solo muestra el mensaje).
> - Añadido: 409 al cambiar el proyecto de operaciones ya relacionadas (`edit-details`, `edit-purchase`,
>   `/transaction/edit`), y alta de artículos (`activity-purchase`) transaccional (M10).
> - Pendientes heredados de la fase 2 también resueltos: revocación de sesión en `checkJwt` (H16) y limpieza/escritura
>   atómica del caché de archivos (M17).
> - Se encontró y corrigió que `api/.env.test` nunca se había versionado (el `.gitignore` raíz lo excluía).

1. **Migraciones en vez de `synchronize`**: `src/migration/`, scripts `migration:generate`/`migration:run`
   (TypeORM 0.2: `ts-node ./node_modules/typeorm/cli.js migration:generate -n …`); `DB_SYNCRO=false` en
   `.env.example`, `Dockerfile` y `.env.test` (las pruebas corren `migration:run`). Primera migración
   `0001-baseline` generada contra una BD creada con `synchronize`: debe salir **vacía** (paridad).
2. Migración `0002-movimiento-relacion`: tabla `movimiento_relacion` (FKs, índices, `UNIQUE(origenId, derivadoId)`),
   `movimiento.fecha` (default `CURRENT_TIMESTAMP(6)`; para filas existentes se rellena con `operacion.fecha`
   o `grupo.fecha` en la misma migración, único dato histórico que sí se completa), `inventario_actual_historico.movimientoId`,
   vista `v_movimiento_saldo`.
3. Entidades según §2.1 + `MovimientoTipoId.ts`.
4. `MovimientoService.resolverRelaciones(inventarioActualId, proyectoId, tipo, cantidad, relacionesOpcionales, strict)`:
   salidas abiertas (`saldo > 0`) FIFO; valida reglas 1-6; 409 con candidatas en modo `strict`.
5. `MovimientoService.registrarOperacion(...)` transaccional: `FOR UPDATE` inventario → `efectosInventario` →
   histórico **con `movimiento`** → operación → movimiento (`fecha`) → `movimiento_relacion` → `estatus` de la
   cadena → `ProductoInventariado` → grupo. Sustituye `guardarConOperacion`, `guardarConOperacionCompra`,
   `agregarOperacion` y el `switch` de `actualizarInventarioActual`.
6. `MovimientoService.deshacer(movimientoId)`: solo si el movimiento **no es origen de ninguna relación**
   (409 con la lista si lo es); borra sus relaciones como derivado (CASCADE) restaurando saldo; restaura la
   instantánea **ligada a ese movimiento**; recalcula `estatus`; transaccional.
7. Endpoints (`routes/movimientos.Routes.ts`, roles entre paréntesis):
   - `GET /activity/:id/chain` (`MOVIMIENTO-DETALLE`) → `{ movimiento, relacionesComoDerivado:[{origen, cantidad, tipo}], relacionesComoOrigen:[…], saldoPendiente }`.
   - `GET /activity/open-by-inventory/:inventarioActualId?proyectoId=` (`MOVIMIENTO-HISTORIAL`) → salidas con saldo.
   - `PUT /groups/activity` y `PUT /groups/activity-add-transaction` aceptan `relaciones?: [{ origenId, cantidad }]` y `strict?: boolean`.
   - `GET /activity/:id` incluye `fecha`, relaciones y `saldoPendiente`.
8. Reescribir `aceptarDevolucionBaja` (con el modo de compatibilidad de la regla 8) y
   `funcionQueryListadoPrestamosPendientes` sobre `v_movimiento_saldo`.
9. Eliminar `convertMovementType`/`convertInvoiceType`/`export2supabase` (Supabase se retira; ver fase 4).

**Pruebas:**
- Unitarias `efectosInventario.test.ts`: 17 tipos × estados (disponible, sin existencia, baja, cantidad >
  existencia, cantidad ≤ 0); 100 % de ramas.
- Unitarias `resolverRelaciones.test.ts` (repositorios mock): FIFO que reparte 7 entre préstamos de 3 y 4
  (dos filas); saldo parcial; proyecto distinto → error; 12 → 7; `strict` con candidatas múltiples → 409;
  relaciones explícitas que exceden saldo → 400; suma de relaciones ≠ cantidad → 400.
- Integración: préstamo 5 → devoluciones 2 + 3 → saldo 0 → tercera devolución 400; devolución de 7 que
  cubre dos préstamos (3 + 4) crea 2 relaciones; transferencia A→B→devolución en B; deshacer un origen con
  derivados → 409; deshacer el penúltimo ya no corrompe (pasa a verde); dos préstamos concurrentes sobre
  `cantidad=1` → uno 200 y otro 400, `cantidad=0` (verde); inventario con préstamo **anterior a la
  migración** (sin relaciones) acepta devolución por el modo de compatibilidad y lo registra en log.
- `migration:generate` tras aplicar migraciones no produce cambios.

**Aceptación:** suite verde; `DB_SYNCRO=false` en todos los entornos; `docs/api/procedimiento-migracion-produccion.md`
(respaldo `mariadb-dump`, `migration:run`, verificación con consultas de control, rollback con `migration:revert`).

### Fase 4 · Limpieza y optimización del código

1. Borrar `src/entity-old/`, `src/excel.ts`, código Supabase (`obtenerGenerarArchivo*Supabase`,
   `export2Supabase`, `convert*`), imports muertos (`setSourceMapRange`, `isJSDocReadonlyTag`, `register`,
   lodash sin uso), bloques comentados > 20 líneas, archivos vacíos (`LogPeticiones.Controllers.ts`,
   `LogOperacion.Controller.ts`). `console.log` → `pino` (nivel por `LOG_CONSOLE_VERBOSE`), `pino-http`
   sustituye `request-stats` para `LogPeticiones`.
2. `package.json`: `@types/*`, `typescript`, `ts-node`, `ts-node-dev` a `devDependencies`; eliminar
   `@supabase/supabase-js`, `@magicbell/core`, `@sentry/tracing`, `express-prom-bundle`, `prom-client`,
   `request`, `request-promise`, `request-stats`, `@types/request*`, `randomstring`, `file-type`, `moment`,
   `lodash`, `password-generator`; declarar `dotenv` (M19); `body-parser` → `express.json()`. Script `test`.
3. Magic numbers → `MovimientoTipoId` en todo `src`. Front: coordinar la corrección de los tipos que envía
   (`3.bajas/nuevo` envía 5; hallazgo L18/F6) **revisándolo con el propietario**. (`7.inventario/nuevo`, que enviaba 15,
   se eliminó con el inventario físico: decisión 10.)
4. Unificar controladores en `async/await` + `asyncHandler` (o Express 5 en fase 5).
5. Quitar `eager: true` de relaciones pesadas y cargar explícitamente; medir con `maxQueryExecutionTime`
   (objetivo: `GET /activity/:id` < 10 consultas).
6. Renombrar archivos con typos (`ProductoCaractetistica`, `InventarioAcutalHistorico`, `LogPeticiones.Controllers`) con `git mv`.
7. `tsconfig.json`: `strict: true` progresivo, `target: ES2022`, `skipLibCheck`; eliminar `exclude` obsoleto.
8. `Dockerfile`: `node:24-alpine`, multi-stage (`tsc` → `node build/index.js`), usuario no root, `WORKDIR`
   y `VOLUME` coherentes (`/code/exogrid`), sin devDeps; `.nvmrc` = 24; corregir `deploy*.sh` (commit/tag
   después del despliegue, `docker rm -f` tolerante).

**Pruebas:** suite completa; `tsc --noEmit`; `npm audit --omit=dev` sin críticas; `autocannon` 30 s sobre
los 5 endpoints más usados antes/después → `docs/api/rendimiento.md`.

### Fase 5 · Actualización de dependencias de runtime

| Paquete | Actual | Objetivo | Nota |
|---|---|---|---|
| node | 14 | 24 LTS | TypeORM 1.x exige ≥ 20.19; Sentry 11 soporta 22/24. |
| express | 4.17 | 5.3 | Promesas rechazadas van a `next` solas; `req.query` solo lectura; rutas `:id([0-9]+)` → `:id` + validación zod (23 archivos de rutas). |
| helmet | 5 | 8 | CSP por defecto: verificar imágenes `blob:`/`data:` del front. |
| jsonwebtoken | 8.5 | 9 | `algorithms` explícitos; secreto ≥ 32 bytes (validar al arrancar). |
| bcryptjs | 2.4 | 3 | API igual. |
| multer | 1.4 | 2.5 | 1.x tiene CVEs; añadir `limits.fileSize`. |
| sharp | 0.30 | 0.35 | Prebuilt para Node 24. |
| class-validator | 0.13 | 0.15 (o retirar a favor de zod) | `forbidUnknownValues` por defecto. |
| @sentry/node | 6 | 11 | ya en fase 2. |
| exceljs, nodemailer, cors, typescript 5.9, pino | | últimas | TypeScript 7 solo cuando TypeORM confirme decoradores. |

**Pruebas:** suite completa + humo de subida de archivo (`POST /item/file`) y Excel (`/reports/*`) +
`rutas.int.test.ts` que recorre todas las rutas con token admin esperando ≠ 404 (detecta la nueva sintaxis de Express 5).

### Fase 6 · TypeORM 0.2 → 1.x

1. `src/data-source.ts` con `new DataSource({...})`; `AppDataSource.initialize()` en `index.ts`; borrar
   `conexionORM.ts`/`ormconfig.js`/`createConnections`.
2. Reemplazos: `getRepository(X)` → `AppDataSource.getRepository(X)` (o `EntityManager` inyectado en servicios
   para transacciones); `findOne(id)` → `findOneBy({ id })`; `findOneOrFail(id, { relations: [...] })` →
   `findOneOrFail({ where: { id }, relations: { a: true } })`; `findByIds(ids)` → `findBy({ id: In(ids) })`;
   `getConnection()` → `AppDataSource`; suscriptor `event.connection` → `event.manager`.
3. CLI: `typeorm-ts-node-commonjs migration:generate src/migration/Nombre -d src/data-source.ts`.

**Pruebas:** suite completa; `migration:generate` vacío.

### Fase 7 · Sistema de notificaciones propio (sustituye MagicBell)

**Objetivo:** avisar a usuarios de eventos del sistema (reporte listo, préstamo vencido, devolución pendiente)
sin servicio externo. El front lo consume con `NotificacionesCampana` (plan 01).

1. Entidad `Notificacion`: `id`, `usuario` (ManyToOne), `titulo`, `mensaje`, `tipo` (`reporte`, `prestamo`,
   `sistema`), `enlace` (ruta del front o `GET /file/report/:nombre`), `leida: boolean`, `fecha`, `fechaLectura`.
   Migración `0004-notificacion`.
2. `NotificacionService`: `crear(usuarioId, …)`, `listar(usuarioId, { soloNoLeidas, pagina })`, `marcarLeida`,
   `marcarTodasLeidas`, `contarNoLeidas`. Emisor interno (`EventEmitter`) para SSE.
3. Endpoints (`routes/notificaciones.Routes.ts`, todos `checkJwt`): `GET /notifications?unread=1`,
   `GET /notifications/count`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`,
   `GET /notifications/stream` (Server-Sent Events con `text/event-stream`; reconexión del cliente; fallback
   del front a polling cada 60 s si SSE falla).
4. Productores: `Reportes.Controller` crea la notificación al terminar (o fallar) la generación del Excel
   (sustituye los bloques MagicBell comentados y corrige H8: el `catch` ya no relanza, notifica);
   tarea programada (`node-cron` o `setInterval` al arrancar) que notifica préstamos con saldo abierto más
   antiguos que `DIAS_CUARENTENA`.
5. Retención: job diario que borra notificaciones leídas con más de 90 días.

**Pruebas:** unitarias del servicio (mocks); integración: generar un reporte crea notificación para el
solicitante; `GET /notifications/count` refleja no leídas; `PUT read` cambia estado y `fechaLectura`;
SSE entrega un evento al crear notificación (supertest con stream); un usuario no ve notificaciones de otro.

## 4. Orden y dependencias

```
F0 entorno ─▶ F1 caracterización ─▶ F2 correcciones (+IP, +Sentry) ─▶ F3 modelo + migraciones ─▶ F4 limpieza (−Supabase) ─▶ F5 deps ─▶ F6 TypeORM 1.x ─▶ F7 notificaciones
```
F7 puede adelantarse tras F3 si el front la necesita antes.

## 5. Cambios de contrato con el front (coordinar con plan 01)

- `POST /auth/login`: `ip` del body se ignora.
- `PUT /groups/activity`, `PUT /groups/activity-add-transaction`: campos opcionales `relaciones`, `strict`; nuevo 409 con `candidatas`.
- `GET /activity/:id`: `fecha`, `relacionesComoDerivado`, `relacionesComoOrigen`, `saldoPendiente`. Nuevo `GET /activity/:id/chain`.
- `DELETE /groups/activity`: 409 si el movimiento es origen de relaciones.
- `PUT /current-inventory/edit`: ya no acepta `cantidad`, `cantidadAlmacen`, `disponible`.
- Handlers vacíos responden 501.
- Nuevo recurso `/notifications` (fase 7).

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Movimientos históricos sin relaciones | Modo de compatibilidad (regla 8) + log `warn`; se podrá hacer backfill después con el respaldo. |
| `synchronize: true` en producción | Fase 3 paso 1 lo desactiva antes de añadir tablas; baseline vacía demuestra paridad. |
| Front depende de `estatus` activo/inactivo | Se mantiene y se recalcula. |
| Bloqueo pesimista con `eager` masivo | `FOR UPDATE` solo por `id`, sin relaciones. |
| Express 5 cambia sintaxis de rutas | `rutas.int.test.ts` recorre todas las rutas. |
| `trust proxy` mal configurado registra la IP del proxy | Prueba de integración con `X-Forwarded-For`; `TRUST_PROXY` documentado. |

## 7. Puntos a revisar sobre la marcha con el propietario

- ~~`nuevoConInventario` toma inventarios de **todas** las bodegas~~ → resuelto: el inventario físico por grupos se
  eliminó el 2026-11-08 (decisión 10).
- El front envía tipo 15 (COMPRA) al crear un inventario y el tipo legado 5 en bajas (fase 4, paso 3).
- Tipos 6, 9 y 10 no tienen efecto en inventario hoy.
- Duración del JWT (hoy 12 h sin renovación efectiva; se unifica a 12 h en fase 2).
