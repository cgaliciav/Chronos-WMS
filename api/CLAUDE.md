# api/ · guía para agentes

API REST del almacén. **Node 24** (`.nvmrc`, `Dockerfile` multietapa `node:24-alpine`) · **Express 4** ·
**TypeORM 0.2.45** (`getRepository`, `createConnection`) · **MariaDB** (driver `mysql2` 3) · TypeScript 5.9
(no estricto; `tsconfig.estricto.json` aplica `strict` a services, helpers, esquemas, middlewares y migration).
Arranque: `npm run dev` (ts-node-dev) o `npm start` (ts-node); compilado: `npm run build && npm run prod`.
Puerto `PORT_ALMACEN_API` (4100 dev). Logs: `logger` de `helpers/logger.ts` (pino), **no `console.*`**.
Pruebas: `npm run test:unit` (sin BD), `npm run test:int` (MariaDB de `.env.test`, recrea el esquema con las
migraciones), `npm run typecheck`. Guía completa en `docs/api/pruebas.md`.
Esquema: **migraciones** (`src/migration/`, `npm run migration:show|run|revert|generate` en desarrollo;
`node build/migrar.js show|run|revert` en la imagen); `DB_SYNCRO=false`. Despliegue: `./desplegar.sh pruebas|produccion`.
Rendimiento: `npm run rendimiento` (`docs/api/rendimiento.md`).

## Mapa del código

```
src/index.ts            bootstrap: dotenv, conectarORM(), crearApp({ registrarPeticiones: true }), listen, señales
src/app.ts              crearApp(): express + cors + helmet + express.json + rutas + errorMiddlewere (sin listen; lo usan las pruebas);
                        con registrarPeticiones añade pino-http y LogPeticiones (solo index.ts)
src/migrar.ts           migraciones sin ts-node (node build/migrar.js show|run|revert)
src/entity/index.ts     ENTIDADES y SUSCRIPTORES explícitos (úsalos en lugar de globs)
src/test/               env.ts, conexion.ts, seed.ts (SEMILLA), factories.ts, resetDb.ts, *.int.test.ts
src/conexionORM.ts      opcionesConexion() desde el entorno con listas explícitas (ENTIDADES, MIGRACIONES, SUSCRIPTORES);
                        aplica el parche de TypeORM y avisa si hay migraciones pendientes. ormconfig.js solo sirve a la CLI
src/migration/          migraciones (baseline idempotente + MovimientoRelacion) e index.ts con la lista MIGRACIONES
src/services/           MovimientoService (registrar/deshacer/relacionar, transaccional), guardasRelacion,
                        reglas/efectosInventario.ts y reglas/planificarRelaciones.ts (funciones puras)
src/routes/*.Routes.ts  un router por recurso; cada ruta lleva [checkJwt, checkRole([...])]
src/middlewares/        verificarJwt (cabecera `auth`), verificarRol (roles + áreas/bodegas/proyectos en res.locals), manejoErrores (AppError → JSON {code,message}), pasada (log)
src/controllers/        clases con métodos estáticos (req,res,next); parsean, llaman a servicios o hacen CRUD y responden.
                        Los movimientos ya pasan por src/services; el resto de la lógica sigue en controladores
src/controllers/common/Common.Controller.ts  CRUD genérico: listaTabla(Qry/And), nuevo, editar, habilitar/deshabilitar/finalizar, comentarios, archivos
src/entity/             entidades TypeORM (ver docs/api/modelo-de-datos.md)
src/subscriber/         GeneralSubscriber: auditoría automática en LogFuncionamiento usando entity.sesionId
src/helpers/            errorClases (AppError, con `detalle` para respuestas 409), filtrosTabla (filtros/orden parametrizados),
                        ids (idSeguro), numericTransformer, archivosSeguros, cacheArchivos (escritura atómica y limpieza),
                        logger (pino), parcheTypeorm (caché de replacePropertyNames, hasta TypeORM 1.x), paquete (versión),
                        validacion, enviarMail (nodemailer), excelFunctions (reportes exceljs, 2 800 líneas), passGenerator
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
  `MovimientoService.enTransaccion` (no `getRepository`), y la primera sentencia debe ser el bloqueo.
- `sesionId` en las entidades **no es columna**: lo lee el suscriptor de auditoría. Siempre asígnalo
  (`registro.sesionId = jwtPayload.si`) antes de `save`.
- JWT: `{ ui: usuarioId, u: nombre, si: sesionId }`, 12 h, cabecera `auth`. `res.locals.jwtPayload`.
- Respuestas de error: `throw new AppError(mensaje, statusCode)` y `next(error)` en el `catch`.

## Convenciones al escribir código aquí

- Métodos de controlador `static nombre = async (req, res, next) => { try { … res.json(x) } catch (e) { next(e) } }`.
  **Siempre `await`** las promesas (varios fallos actuales son promesas sueltas) y **siempre responde**.
- Consultas con QueryBuilder **parametrizadas** (`:param`, `IN (:...ids)`); nunca interpoles valores del
  request en SQL. Para filtros de tablas usa `construirFiltros`/`aplicarFiltros`, para `IN` con arreglos
  `andWhereIn`, para `sortField` `columnaSegura`, y para `MATCH … AGAINST` `textoBusquedaBooleana`
  (todo en `helpers/filtrosTabla.ts`).
- Ids del body: `idSeguro(x)` / `idsSeguros(xs)` (`helpers/ids.ts`) antes de `findOne`. En TypeORM 0.2,
  `findOne(undefined)` devuelve la **primera fila**.
- Cuerpos de petición nuevos: esquema zod en `src/esquemas/index.ts` + `validarBody(esquema)` en la ruta
  (`.strip()` para descartar campos desconocidos). `CommonController.nuevo/editar` nunca copian
  `id`, `password`, `sesionId` ni `estatus` del body.
- Las columnas `numeric` ya exponen `number` gracias a `numericTransformer`; al declarar una nueva columna
  `numeric` añade el transformer.
- Rutas que sirve el navegador sin cabeceras (`<img>`, descargas) usan `checkJwtArchivos` (acepta `?auth=`).
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
`IMAGENES_IMPORTACION`), `SMTP_*`, `DIAS_CUARENTENA`, `CACHE_ARCHIVOS_DIAS`, `REPORTES_DIAS`, `LOG_NIVEL`
(o `LOG_CONSOLE_VERBOSE`).
`ENV_FILE=.env.test npm run migration:show` apunta la CLI de TypeORM a otro archivo de variables.

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
