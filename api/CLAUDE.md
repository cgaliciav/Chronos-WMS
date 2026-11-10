# api/ · guía para agentes

API REST del almacén. **Node 24** (`.nvmrc`, `Dockerfile` multietapa `node:24-alpine`) · **Express 5** ·
**TypeORM 1.1** (`AppDataSource` de `src/data-source.ts`) · **MariaDB** (driver `mysql2` 3) · TypeScript 5.9
(no estricto; `tsconfig.estricto.json` aplica `strict` a services, helpers (también excelFunctions), esquemas, middlewares y migration).
Arranque: `npm run dev` (ts-node-dev) o `npm start` (ts-node); compilado: `npm run build && npm run prod`.
Puerto `PORT_ALMACEN_API` (4100 dev). Logs: `logger` de `helpers/logger.ts` (pino), **no `console.*`**.
Pruebas: `npm run test:unit` (sin BD), `npm run test:int` (MariaDB de `.env.test`, recrea el esquema con las
migraciones), `npm run typecheck`. Guía completa en `docs/api/pruebas.md`.
Esquema: **migraciones** (`src/migration/`, `npm run migration:show|run|revert|generate` en desarrollo, sin CLI de TypeORM;
`node build/migrar.js show|run|revert` en la imagen); `DB_SYNCRO=false`. Despliegue: `./desplegar.sh pruebas|produccion`.
Rendimiento: `npm run rendimiento` (`docs/api/rendimiento.md`).
Versión: `package.json` (`helpers/paquete.ts`), con las reglas de versionado del `CLAUDE.md` raíz (`vX.Y.Z`,
sufijos `-d` en desarrollo y `-s` en staging); cambios en `CHANGELOG.md`.

## Mapa del código

```
src/index.ts            bootstrap: ./entorno, conectarORM(), crearApp({ registrarPeticiones: true }), listen, señales
src/app.ts              crearApp(): express + cors + helmet + express.json + rutas + errorMiddlewere (sin listen; lo usan las pruebas);
                        con registrarPeticiones añade pino-http y LogPeticiones (solo index.ts)
src/migrar.ts           migraciones sin ts-node (node build/migrar.js show|run|revert)
src/entity/index.ts     ENTIDADES y SUSCRIPTORES explícitos (úsalos en lugar de globs)
src/test/               env.ts, conexion.ts, seed.ts (SEMILLA), factories.ts, resetDb.ts, *.int.test.ts
src/data-source.ts      AppDataSource (TypeORM 1.x) con opcionesDataSource() desde el entorno y listas explícitas (ENTIDADES,
                        MIGRACIONES, SUSCRIPTORES); conectarORM() la inicializa y avisa si hay migraciones pendientes
src/migration/          migraciones (baseline idempotente, MovimientoRelacion, Notificacion) e index.ts con la lista MIGRACIONES
src/services/           MovimientoService (registrar/deshacer/relacionar, transaccional), guardasRelacion,
                        NotificacionService (crear/listar/marcar, emisor para SSE, vencimientos y retención cada 6 h),
                        reglas/efectosInventario.ts, reglas/planificarRelaciones.ts y reglas/notificaciones.ts (puras)
src/routes/*.Routes.ts  un router por recurso; cada ruta lleva [checkJwt, checkRole([...])]; los ids numéricos usan
                        `"/x/:id", soloDigitos("id")` (middlewares/rutas.ts): Express 5 no admite `:id([0-9]+)`
src/middlewares/        verificarJwt (cabecera `auth`; checkJwtArchivos y checkJwtConsulta aceptan `?auth=`), verificarRol (roles + áreas/bodegas/proyectos en res.locals), manejoErrores (AppError → JSON {code,message}), pasada (log)
src/controllers/        clases con métodos estáticos (req,res,next); parsean, llaman a servicios o hacen CRUD y responden.
                        Los movimientos ya pasan por src/services; el resto de la lógica sigue en controladores
src/controllers/common/Common.Controller.ts  CRUD genérico: listaTabla(Qry/And), nuevo, editar, habilitar/deshabilitar/finalizar, comentarios, archivos
src/entity/             entidades TypeORM (ver docs/api/modelo-de-datos.md)
src/subscriber/         GeneralSubscriber: auditoría automática en LogFuncionamiento usando entity.sesionId
src/helpers/            errorClases (AppError, con `detalle` para respuestas 409), filtrosTabla (filtros/orden parametrizados),
                        ids (idSeguro), numericTransformer, archivosSeguros, cacheArchivos (escritura atómica y limpieza),
                        logger (pino), opcionesFind (rutas "a.b" → objeto de relations/select), paquete (versión),
                        validacion, enviarMail (nodemailer), excelFunctions (reportes exceljs, 1 800 líneas, ver reportes.int.test), passGenerator
src/esquemas/           esquemas zod de los cuerpos de petición (se aplican con middlewares/validar.ts)
src/sentry.ts           Sentry preparado: solo se inicializa con SENTRY_DSN
```

Documentación detallada: `docs/api/modelo-de-datos.md`, `docs/api/tipos-de-movimiento.md`,
`docs/api/endpoints.md`. Fallos conocidos: `docs/hallazgos-codigo.md` (sección A).

## Conceptos clave

- **Grupo** = listado (una compra/factura, un préstamo a un proyecto, una baja… o una lista libre). Un listado con
  `GrupoDetalle` es del tipo de movimiento que contiene: todas sus líneas son de ese tipo (decisión 11; las bajas son
  13 o 16). Los tipos 6, 9 y 10 no son movimientos (decisión 12).
  **Movimiento** = una línea del listado: `cantidad` de un **InventarioActual** (existencia de un
  producto en una bodega). **Operacion** = la acción aplicada al movimiento (tipo, proyecto, usuarios, fecha).
- Registrar una operación (`PUT /groups/activity`) pasa por `GrupoController.agregarMovimiento` →
  `MovimientoService.registrarOperacion`: **una transacción** que bloquea el inventario (`FOR UPDATE`), calcula el
  efecto (`reglas/efectosInventario`), resuelve las relaciones con las salidas abiertas (`reglas/planificarRelaciones`,
  FIFO o `relaciones` explícitas) y guarda operación, movimiento, instantánea ligada, inventario, `movimiento_relacion`,
  `estatus`, `ProductoInventariado` y grupo. `DELETE /groups/activity` → `MovimientoService.deshacer`.
- La relación devolución → préstamo es explícita (`MovimientoRelacion`, N:M con cantidad). Saldo pendiente =
  vista `v_movimiento_saldo`. Los movimientos anteriores a la fase 3 tienen `legado = true` y no tienen relaciones
  (modo de compatibilidad, `docs/api/modelo-de-datos.md`). `Movimiento.estatus` está `@deprecated` (lo lee el front).
- Para escribir dentro de una transacción usa el `EntityManager` que recibe el callback de
  `MovimientoService.enTransaccion` (no `AppDataSource.getRepository`), y la primera sentencia debe ser el bloqueo.
- `sesionId` en las entidades **no es columna**: lo lee el suscriptor de auditoría. Siempre asígnalo
  (`registro.sesionId = jwtPayload.si`) antes de `save`.
- JWT: `{ ui: usuarioId, u: nombre, si: sesionId }`, 12 h, cabecera `auth`. `res.locals.jwtPayload`. Con contraseña
  temporal lleva además `cp: true` y `checkJwt` solo admite las rutas de `rutaPermitidaConCambioPendiente`
  (`services/PasswordService.ts`, hallazgo L2); nunca asignes contraseñas a mano: `asignarPasswordTemporal`/`Definitiva`.
- Respuestas de error: `throw new AppError(mensaje, statusCode)` y `next(error)` en el `catch`.

## Convenciones al escribir código aquí

- Métodos de controlador `static nombre = async (req, res, next) => { try { … res.json(x) } catch (e) { next(e) } }`.
  **Siempre `await`** las promesas y **siempre responde**. Con Express 5 una promesa rechazada del manejador llega sola
  a `errorMiddlewere`, pero una promesa suelta (sin `await`) sigue perdiéndose.
- Parámetros de ruta con `parametro(req, "id")` (`helpers/ids.ts`): Express 5 los tipa `string | string[]`.
  `req.body` siempre es un objeto (`app.ts` pone `{}` si no hubo cuerpo). `req.query` usa el parser simple de Express 5
  (sin objetos anidados).
- Consultas con QueryBuilder **parametrizadas** (`:param`, `IN (:...ids)`); nunca interpoles valores del
  request en SQL. Para filtros de tablas usa `construirFiltros`/`aplicarFiltros`, para `IN` con arreglos
  `andWhereIn`, para `sortField` `columnaSegura`, y para `MATCH … AGAINST` `textoBusquedaBooleana`
  (todo en `helpers/filtrosTabla.ts`).
- Ids del body: `idSeguro(x)` / `idsSeguros(xs)` / `idOpcional(x)` (`helpers/ids.ts`) antes de consultar: TypeORM 1.x
  lanza un error (500) si un `where` lleva `undefined` o `null` (en 0.2 cargaba la primera fila).
- TypeORM 1.x: `findOneBy({ id })`, `findBy({ id: In(ids) })`, `findOne({ where, relations: { a: { b: true } } })`
  (`relations`/`select` son objetos; `rutasAObjeto` de `helpers/opcionesFind.ts` convierte listas `"a.b"`).
  `findOne` y `getOne()` devuelven **`null`** si no hay fila: compara con `== null`, no con `=== undefined`.
  `findOne` sin `where` lanza error (usa `find({ order, take: 1 })`). `findOne` con relaciones a-muchos hace dos
  consultas (DISTINCT + datos); en rutas calientes usa QueryBuilder (`middlewares/verificarRol.ts`).
- Cuerpos de petición nuevos: esquema zod en `src/esquemas/index.ts` + `validarBody(esquema)` en la ruta
  (`.strip()` para descartar campos desconocidos). `CommonController.nuevo/editar` nunca copian
  `id`, `password`, `sesionId` ni `estatus` del body.
- Las columnas `numeric` ya exponen `number` gracias a `numericTransformer`; al declarar una nueva columna
  `numeric` añade el transformer.
- Rutas que sirve el navegador sin cabeceras (`<img>`, descargas) usan `checkJwtArchivos` (acepta `?auth=`);
  `GET /notifications/stream` (EventSource) usa `checkJwtConsulta` (igual, pero sin la excepción de `ARCHIVOS_PUBLICOS`).
- Para avisar a un usuario: `NotificacionService.crear(usuarioId, { titulo, mensaje, tipo, url, clave })` (`clave` evita
  repetir un aviso). Las tareas en segundo plano (reportes) no deben rechazar: captura y notifica el error.
- Usa `MovimientoTipoId` y las clases `TIPOS_*` (`src/entity/common/MovimientoTipoId.ts`) en vez de números
  (`docs/api/tipos-de-movimiento.md`). Desde la fase 4 no quedan números de tipo en `src` (salvo pruebas).
- Al cambiar una entidad: `npm run migration:generate -- NombreDelCambio`, revisa el archivo, añádelo a
  `src/migration/index.ts`. `npm run test:int` falla si las migraciones no reproducen las entidades.
- Archivos de código con finales de línea CRLF (casi todos los controladores y entidades): consérvalos al editar.
- Nuevos listados: reutiliza `CommonController.listaTablaQryAnd` y define una lista blanca de columnas filtrables/ordenables.
- No añadas dependencias en `dependencies` que sean de desarrollo (`@types/*`, `typescript`, `ts-node`): la imagen
  de producción poda las devDependencies y el código compilado no puede usarlas.
- No importes JSON fuera de `src/` (rompe la estructura de `build/`); usa `helpers/paquete.ts` para la versión.
- Código nuevo de services/helpers/middlewares debe compilar con `strict` (`npm run typecheck` lo comprueba).

## Variables de entorno

Ver `.env.example`. Imprescindibles: `JWTSECRET`, `SALT_ROUNDS`, `DB_HOST/PORT/USER/PASSWORD/DATABASE_NAME`,
`DB_SYNCRO` (**`false`**: el esquema lo cambian las migraciones), `DB_LOGGING`,
`PORT_ALMACEN_API`, rutas de archivos (`RUTA_ARCHIVOS`, `RUTA_REPORTES`, `UPLOADS`, `ARCHIVOS_AUXILIARES`,
`IMAGENES_IMPORTACION`), `SMTP_*`, `DIAS_CUARENTENA`, `HORAS_PASSWORD_TEMPORAL`, `CACHE_ARCHIVOS_DIAS`, `REPORTES_DIAS`, `LOG_NIVEL`
(o `LOG_CONSOLE_VERBOSE`).
`ENV_FILE=.env.test npm run migration:show` apunta `src/migrar.ts` a otro archivo de variables.

## Decisiones tomadas (`docs/decisiones.md`)

Relación entre movimientos **N:M** (`movimiento_relacion`), **sin backfill** de históricos, IP de sesión
desde `req.ip` (no del body), Sentry preparado tras `SENTRY_DSN`, Supabase y MagicBell se retiran
(notificaciones propias en plan 02 fase 7), MariaDB ≥ 10.11 para pruebas.

## Qué no hacer

- No ejecutes `synchronize`/migraciones contra producción desde una sesión automatizada.
- No modifiques una migración ya publicada: crea otra. No uses `synchronize` para "arreglar" el esquema.
- No cambies existencias (`cantidad`, `cantidadAlmacen`, `disponible`) ni crees o borres operaciones y relaciones
  fuera de `MovimientoService`: perderías el bloqueo, la instantánea ligada y las relaciones.
- No cambies rutas HTTP ni el contrato `list-antd` sin actualizar `docs/api/endpoints.md` y el front.
