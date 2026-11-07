# api/ · guía para agentes

API REST del almacén. **Node 22** (`.nvmrc`, `Dockerfile node:22-alpine`) · **Express 4** ·
**TypeORM 0.2.41** (`getRepository`, `createConnection`) · **MariaDB** · TypeScript 5.9 **no estricto**.
Arranque: `npm run dev` (ts-node-dev) o `npm start` (ts-node). Puerto `PORT_ALMACEN_API` (4100 dev).
Pruebas: `npm run test:unit` (sin BD), `npm run test:int` (MariaDB de `.env.test`, recrea el esquema),
`npm run typecheck`. Guía completa en `docs/api/pruebas.md`.

## Mapa del código

```
src/index.ts            bootstrap: dotenv, conectarORM(), crearApp(), listen, señales, request-stats → LogPeticiones
src/app.ts              crearApp(): express + cors + helmet + body-parser + rutas + errorMiddlewere (sin listen; lo usan las pruebas)
src/entity/index.ts     ENTIDADES y SUSCRIPTORES explícitos (úsalos en lugar de globs)
src/test/               env.ts, conexion.ts, seed.ts (SEMILLA), factories.ts, resetDb.ts, *.int.test.ts
src/conexionORM.ts      createConnection(s) con ormconfig.js (entities src/entity/**/*.ts, synchronize por DB_SYNCRO)
src/routes/*.Routes.ts  un router por recurso; cada ruta lleva [checkJwt, checkRole([...])]
src/middlewares/        verificarJwt (cabecera `auth`), verificarRol (roles + áreas/bodegas/proyectos en res.locals), manejoErrores (AppError → JSON {code,message}), pasada (log)
src/controllers/        clases con métodos estáticos (req,res,next); la lógica de negocio vive AQUÍ (no hay capa de servicios)
src/controllers/common/Common.Controller.ts  CRUD genérico: listaTabla(Qry/And), nuevo, editar, habilitar/deshabilitar/finalizar, comentarios, archivos
src/entity/             entidades TypeORM (ver docs/api/modelo-de-datos.md); entity-old/ es código muerto
src/subscriber/         GeneralSubscriber: auditoría automática en LogFuncionamiento usando entity.sesionId
src/helpers/            errorClases (AppError), filtrosTabla (filtros/orden parametrizados), ids (idSeguro), numericTransformer,
                        archivosSeguros, enviarMail (nodemailer), excelFunctions (reportes exceljs, 2 800 líneas), passGenerator
src/esquemas/           esquemas zod de los cuerpos de petición (se aplican con middlewares/validar.ts)
src/sentry.ts           Sentry preparado: solo se inicializa con SENTRY_DSN
```

Documentación detallada: `docs/api/modelo-de-datos.md`, `docs/api/tipos-de-movimiento.md`,
`docs/api/endpoints.md`. Fallos conocidos: `docs/hallazgos-codigo.md` (sección A).

## Conceptos clave

- **Grupo** = listado (una compra/factura, un préstamo a un proyecto, un inventario físico o una lista libre).
  **Movimiento** = una línea del listado: `cantidad` de un **InventarioActual** (existencia de un
  producto en una bodega). **Operacion** = la acción aplicada al movimiento (tipo, proyecto, usuarios, fecha).
- Registrar una operación (`PUT /groups/activity`) pasa por `GrupoController.agregarMovimiento` →
  `MovimientoController.guardarConOperacion` → `actualizarInventarioActual` (switch por tipo) →
  `InventarioActualController.guardarHistorico` (instantánea para deshacer) → `OperacionController.guardar`.
  Hoy **nada es transaccional**.
- `Movimiento.estatus` `activo` marca el último movimiento con operación de cada inventario; no hay FK
  entre una devolución y su préstamo (ese es el problema que resuelve el plan 02).
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
- Usa los ids de `MovimientoTipo` por su significado (`docs/api/tipos-de-movimiento.md`); cuando exista
  `MovimientoTipoId` (plan 02) úsalo en vez de números.
- Nuevos listados: reutiliza `CommonController.listaTablaQryAnd` y define una lista blanca de columnas filtrables/ordenables.
- No añadas dependencias en `dependencies` que sean de desarrollo (`@types/*`, `typescript`, `ts-node`).

## Variables de entorno

Ver `.env.example`. Imprescindibles: `JWTSECRET`, `SALT_ROUNDS`, `DB_HOST/PORT/USER/PASSWORD/DATABASE_NAME`,
`DB_SYNCRO` (**debe ser `false` en producción cuando existan migraciones**), `DB_LOGGING`,
`PORT_ALMACEN_API`, rutas de archivos (`RUTA_ARCHIVOS`, `RUTA_REPORTES`, `UPLOADS`, `ARCHIVOS_AUXILIARES`,
`IMAGENES_IMPORTACION`), `SMTP_*`, `DIAS_CUARENTENA`.

## Decisiones tomadas (`docs/decisiones.md`)

Relación entre movimientos **N:M** (`movimiento_relacion`), **sin backfill** de históricos, IP de sesión
desde `req.ip` (no del body), Sentry preparado tras `SENTRY_DSN`, Supabase y MagicBell se retiran
(notificaciones propias en plan 02 fase 7), MariaDB ≥ 10.11 para pruebas.

## Qué no hacer

- No ejecutes `synchronize`/migraciones contra producción desde una sesión automatizada.
- No borres `InventarioActualHistorico` ni cambies la lógica de `quitar` sin leer el plan 02 (fase 3).
- No cambies rutas HTTP ni el contrato `list-antd` sin actualizar `docs/api/endpoints.md` y el front.
