# api/ · guía para agentes

API REST del almacén. **Node 14** (Dockerfile; `.nvmrc` 14.17; README dice 12) · **Express 4** ·
**TypeORM 0.2.41** (`getRepository`, `createConnection`) · **MariaDB** · TypeScript 4.5 **no estricto**.
Arranque: `npm run dev` (ts-node-dev) o `npm start` (ts-node). Puerto `PORT_ALMACEN_API` (4100 dev).
Pruebas: `npx jest` (config en `jest.config.js`; **los dos tests existentes no pasan**, ver hallazgos L16).

## Mapa del código

```
src/index.ts            bootstrap: dotenv, conectarORM(), express, cors, helmet, body-parser, rutas, errorMiddlewere, request-stats → LogPeticiones
src/conexionORM.ts      createConnection(s) con ormconfig.js (entities src/entity/**/*.ts, synchronize por DB_SYNCRO)
src/routes/*.Routes.ts  un router por recurso; cada ruta lleva [checkJwt, checkRole([...])]
src/middlewares/        verificarJwt (cabecera `auth`), verificarRol (roles + áreas/bodegas/proyectos en res.locals), manejoErrores (AppError → JSON {code,message}), pasada (log)
src/controllers/        clases con métodos estáticos (req,res,next); la lógica de negocio vive AQUÍ (no hay capa de servicios)
src/controllers/common/Common.Controller.ts  CRUD genérico: listaTabla(Qry/And), nuevo, editar, habilitar/deshabilitar/finalizar, comentarios, archivos
src/entity/             entidades TypeORM (ver docs/api/modelo-de-datos.md); entity-old/ es código muerto
src/subscriber/         GeneralSubscriber: auditoría automática en LogFuncionamiento usando entity.sesionId
src/helpers/            errorClases (AppError), enviarMail (nodemailer), excelFunctions (reportes exceljs, 2 800 líneas), passGenerator
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
  request en SQL (hay inyecciones conocidas en los `condicionesWhereAnd`).
- Ids del body: conviértelos con `Number()` y valida antes de `findOne`. En TypeORM 0.2,
  `findOne(undefined)` devuelve la **primera fila**.
- `numeric` → string: usa `Number(x)` (o el `numericTransformer` cuando exista) antes de sumar/comparar.
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
