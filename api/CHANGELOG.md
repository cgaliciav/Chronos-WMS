# Changelog · API

Cambios notables del API de Chronos-WMS. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y la numeración, las reglas de versionado del [`CLAUDE.md` raíz](../CLAUDE.md): `vX.Y.Z`; **mayor** para cambios
drásticos de objetivo, lenguaje o stack; **menor** para capacidades, pautas o herramientas nuevas; **parche** para
correcciones y aclaraciones; sufijo `-d` en desarrollo y `-s` en staging.

La versión vive en `package.json` (la devuelve `/auth/version`, y Sentry la usa como `release`).
`desplegar.sh` publica una versión `X.Y.Z-d` como `X.Y.Z` y, si ya no lleva sufijo, sube el parche. Contrato con el
front: [`docs/api/endpoints.md`](../docs/api/endpoints.md). Plan: [`docs/planes/02-api-relacion-movimientos.md`](../docs/planes/02-api-relacion-movimientos.md).

## [2.84.0-d] - Sin publicar

Contraseña temporal con cambio obligatorio (hallazgo L2). **Migración nueva** `1794336939132-PasswordTemporal` (dos
columnas en `usuario`); el front necesita v4.3.0 para el cambio obligatorio.

### Añadido

- Al dar de alta un usuario o regenerarle la contraseña (`PUT /user/renewpassword`), la contraseña que se envía por
  correo es **temporal**: vence a las `HORAS_PASSWORD_TEMPORAL` horas (72 por defecto) y hay que cambiarla al entrar.
- `POST /auth/login` con una contraseña temporal responde `{ t, cambiarPassword: true }`. Ese token (`cp`) solo admite
  `PUT /user/password`, `GET /user/current` y `POST /auth/logout`; el resto responde 403 con `cambiarPassword: true`.
  Con la temporal vencida, 401.
- `PUT /user/password` exige una contraseña nueva distinta de la actual, quita la marca y responde `{ t }` (también en
  la cabecera `t`): el token normal de la misma sesión.
- `GET /user/current` incluye `cambiarPassword: true` mientras el cambio está pendiente.

### Cambiado

- Los correos de alta y de contraseña nueva avisan de que es temporal, cuándo vence y que se pedirá cambiarla.
- Las cuentas existentes no cambian (sin contraseña temporal) hasta que el administrador les regenere la contraseña.

## [2.83.4-d] - Sin publicar

Limpieza de código (hallazgos L6, L7 y L11). Sin cambios de contrato ni migraciones.

### Cambiado

- ≈ 1 000 líneas menos de código muerto: imports y variables sin uso (`noUnusedLocals` limpio fuera de las pruebas),
  funciones que nadie llamaba (`reporteGeneral2`, `reporteMaquillajeGeneral` y sus consultas, tres consultas de
  `Grupo.Controller`, `queryBusquedaFacturas`) y ≈ 370 líneas de código comentado.
- `excelFunctions.ts`: de 2 739 a 1 808 líneas. Un solo mapeo de renglones por tipo de reporte, una función de fotos
  con el tamaño como parámetro y un solo reporte por grupo con variante normal o de foto grande. Entra en
  `tsconfig.estricto.json`. Los 7 reportes salen idénticos (`reportes.int.test.ts`).
- Los TODO obsoletos se quitan; los pendientes reales dicen que responden 501.

### Corregido

- Los nombres de los reportes usan un sufijo único (milisegundos + aleatorio); antes `Math.random() * 1e6` podía
  repetirse y sobrescribir el reporte de otra persona.
- Un reporte de un proyecto inexistente responde 404 (antes un `TypeError`).

### Pruebas

- `reportes.int.test.ts`: caracterización de los 7 reportes Excel (hojas, celdas, celdas combinadas, imágenes y alturas
  de fila).

## [2.83.3-d] - Sin publicar

Fallos abiertos de `docs/hallazgos-codigo.md` y dependencias. Sin migraciones.

### Corregido

- **M14:** `filtered` es siempre el conteo filtrado. Los catálogos de inventario (`list-catalog-*`) devolvían el
  tamaño de la página y `active-activity-list` el total sin filtrar. `POST /user/list-antd` hace un `COUNT` menos si no
  hay filtros.
- **L19:** los listados con joins (`/groups/list-antd`…) respondían 500 sin `sortField` o con un campo sin alias
  (`"id"`): un campo sin alias se refiere ahora a la entidad principal del listado.
- **L12:** `GET /project/list-names-outbound` e `-inbound` filtran por `esExterno` en la consulta (antes cargaban todos
  los proyectos y filtraban en JS).
- **L3:** `GET /` responde `{ estado: "ok" }` (antes nombre y versión) y `GET /auth/version` solo `{ version }`, sin el
  nombre del paquete. La versión sigue pública: la pantalla de login la muestra y `desplegar.sh` la usa.

### Dependencias

- `npm audit --omit=dev`: **0 avisos** (antes `uuid` 8 de exceljs, moderado; `overrides` a `uuid` ^11.1.1: exceljs solo
  usa `v4`). En desarrollo, `npm audit fix` resolvió babel, brace-expansion, browserslist, js-yaml, minimatch,
  picomatch y diff; queda `deepmerge` (de jest, sin versión corregida, solo en pruebas).
- @sentry/node 11.12, ts-jest 29.4, autocannon 9. Se dejan para más adelante jest 30 y TypeScript 7 (cambios mayores
  sin beneficio de seguridad; TypeScript 7 cuando TypeORM confirme los decoradores) y `@types/node` 26 (el runtime es
  Node 24).

## [2.83.2-d] - Sin publicar

### Corregido

- Las rutas con barras repetidas vuelven a funcionar (`//file/thumbnail/:id` → `/file/thumbnail/:id`, middleware
  `unirBarrasRepetidas`, hallazgo M39). Express 4 las aceptaba; con Express 5 respondían 404, y el front hasta v4.2.1 pide
  así las miniaturas de los listados de movimientos y la subida de archivos (`/file/file`). Necesario para desplegar
  este API mientras siga en producción un front anterior a v4.2.2.

## [2.83.1-d] - Sin publicar

### Corregido

- **Fechas en UTC** (`timezone: "Z"` en `data-source.ts`, hallazgo M38). El driver usaba la zona del proceso: con Node en
  hora local (desarrollo), las fechas que pone MariaDB (`DEFAULT CURRENT_TIMESTAMP`, p. ej. `notificacion.fecha`) se
  leían 6 h en el futuro ("en 6 horas") y las que escribe Node se guardaban en hora local. En staging y producción
  (contenedores en UTC) no cambia nada.
- El suscriptor de auditoría reconoce la entidad por `event.metadata`: con `repo.update(criterio, cambios)` recibía un
  objeto plano y, al marcar notificaciones como leídas, intentaba auditarlas y registraba
  `Field 'idOrigen' doesn't have a default value`.
- `docker-compose.test.yml` tiene su propio nombre de proyecto (`almacen-api-test`): `npm run test:int:up` reemplazaba el
  contenedor de la BD de desarrollo (mismo proyecto `api` y servicio `mariadb`; los datos del volumen se conservaban).

## [2.83.0-d] - Sin publicar

Fase 7 del plan 02: notificaciones propias (sustituyen a MagicBell). **Migración nueva** `1794327605255-Notificacion`
(solo crea la tabla `notificacion`): aplícala con `docs/api/procedimiento-migracion-produccion.md`.

### Añadido

- Recurso `/notifications` (solo token, cada usuario ve las suyas): `GET /notifications?unread=1&page=N` (arreglo, 50
  por página), `GET /notifications/count` (`{ noLeidas }`), `PUT /notifications/:id/read`,
  `PUT /notifications/read-all` (`{ actualizadas }`) y `GET /notifications/stream` (Server-Sent Events; acepta el
  token en `?auth=` porque `EventSource` no envía cabeceras). Contrato en `docs/api/endpoints.md`.
- Los reportes (`/reports/by-group`, `/by-project`, `/by-project-final`) notifican al solicitante al terminar, con el
  enlace `/file/report/<nombre>`, o al fallar, con el error (cierra el pendiente de H8). El correo se sigue enviando.
- Tarea al arrancar y cada 6 h: aviso de préstamos y rentas externas con saldo abierto registrados hace más de
  `DIAS_CUARENTENA` días (120 por defecto), a los usuarios de la operación, una sola vez por movimiento; y retención:
  borra las notificaciones leídas de más de 90 días. Los movimientos legados no se avisan.

### Corregido

- `GET /file/report/:nombre` no encontraba los reportes con espacios o acentos en el nombre (casi todos): el nombre se
  "limpiaba" a `Alta_Proyecto_A.xlsx` y la descarga daba 404, también desde el enlace del correo de reportes de más de
  8 MiB. Ahora se usa el nombre base tal cual (sin directorios, ocultos ni caracteres de control).

### Seguridad

- El token de `?auth=` ya no aparece en los registros (pino-http y `pasada`).

## [2.82.0-d] - Sin publicar

Fase 6 del plan 02: TypeORM 1.x. Sin cambios de esquema ni migraciones nuevas.

### Cambiado

- **TypeORM 1.1.2** (antes 0.2.45) y `reflect-metadata` 0.2. `src/data-source.ts` (`AppDataSource`, `conectarORM`)
  sustituye a `conexionORM.ts` y `ormconfig.js`; desaparecen `getRepository`/`getConnection`/`getManager` globales.
  Consultas con `findOneBy`/`findBy`/`In`, y `relations`/`select` como objetos (`helpers/opcionesFind.ts` convierte las
  listas de los helpers genéricos).
- `npm run migration:show|run|revert` usan `src/migrar.ts` (el mismo código que `node build/migrar.js` en la imagen);
  ya no se usa la CLI de TypeORM.
- Se retira el parche de rendimiento de TypeORM 0.2 (`helpers/parcheTypeorm.ts`): TypeORM 1.x ya no tiene ese coste
  y los listados van igual o más rápido sin él (`docs/api/rendimiento.md`).
- `checkRole` carga roles y áreas con QueryBuilder: con TypeORM 1.x, `findOne` con relaciones a-muchos hace dos
  consultas en lugar de una.
- `Movimiento.grupos` declara `onDelete/onUpdate: "NO ACTION"`: es la FK que ya existe en producción; TypeORM 1.x
  usaría `CASCADE` por defecto en el lado inverso de un `@ManyToMany`.
- `engines.node`: `^22.13.0 || >=24.11.0` (lo exige TypeORM 1.x).

### Corregido

- `POST /groups/new-details` con `proyectoId: null` (bajas sin proyecto) asignaba el listado al **primer proyecto**:
  `findOneOrFail(null)` de TypeORM 0.2 devolvía la primera fila. Ahora el listado queda sin proyecto.
- Ids ausentes o inválidos en el cuerpo de `item/edit`, `item-code/*`, `item-spec/*`, `user/edit`, los reportes por
  proyecto y las altas (tipo de producto, área, bodega, proveedor, tipo de factura, tipo de movimiento) responden
  `400 "<campo> inválido"`. Con TypeORM 0.2 un id ausente cargaba la primera fila de la tabla.
- La auditoría usa `event.dataSource` (el registro se escribe sin esperar a la transacción que lo dispara).

### Seguridad

- `npm audit --omit=dev`: desaparece el aviso crítico de `typeorm` 0.2. Quedan dos transitivos moderado/bajo
  (`uuid` 8 de exceljs y `diff` del ts-node que typeorm 1.1.2 declara como dependencia).

### Pruebas

- `formaRespuestas.int.test.ts`: instantánea de las claves y tipos del JSON de 30 endpoints (detalles, listados y
  escrituras de movimientos) grabada con TypeORM 0.2; la migración la conserva sin cambios.
- Suites verdes en Node 22 y 24; `migration:generate` no encuentra diferencias.

## [2.81.0-d] - Sin publicar

Fase 5 del plan 02: dependencias de runtime.

### Cambiado

- **Express 5.3** (antes 4). Las rutas `:id([0-9]+)` pasan a `:id` con el middleware `soloDigitos`, que conserva el
  comportamiento (un id no numérico sigue sin casar). `req.body` vale `{}` cuando no hay cuerpo, como antes. Las
  promesas rechazadas de los manejadores llegan solas al manejador de errores.
- El parser de consulta por defecto de Express 5 es el simple: `req.query` ya no convierte `a[b]=1` en objetos
  anidados (ningún endpoint los usaba).
- helmet 8, jsonwebtoken 9, bcryptjs 3 (acepta los hashes existentes), multer 2.5, sharp 0.35, nodemailer 10,
  pino 10, pino-http 11, cors, express-rate-limit y dotenv al día; tipos de Node 24.
- Correo: la cabecera de Postmark se envía en cada mensaje, la verificación SMTP se hace al arrancar y `correoHTML`
  envía HTML (hallazgo M22).
- `desplegar.sh` entiende los sufijos `-d`/`-s` del versionado.

### Corregido

- `POST /groups/create-list-from-report-use` y `/create-list-from-report-activity` se quedaban colgadas (manejador
  vacío): ahora responden `501`.
- `POST /current-inventory/get-activity-inventory` con un id inválido se quedaba colgada: ahora responde `400`.

### Seguridad

- `npm audit --omit=dev` sin avisos altos. Queda `typeorm` 0.2 (crítico), que se resuelve con TypeORM 1.x (fase 6).

### Pruebas

- `rutas.int.test.ts` recorre las 141 rutas (ninguna da el 404 de Express ni se cuelga) y
  `humoArchivosReportes.int.test.ts` cubre subida, miniaturas y un reporte Excel con fotos.

## [2.80.0] - 2026-11-09

Fases 3 y 4 del plan 02 y decisiones 10-14 (PR #2): migraciones en lugar de `synchronize`, relación origen→derivado
entre movimientos (`movimiento_relacion`), operaciones transaccionales con bloqueo, deshacer por efecto inverso,
limpieza de código y dependencias, pino, Node 24 e imagen multietapa, listados del tipo que contienen, sin inventario
físico ni tipos 6/9/10, sin depreciación. Detalle en `docs/planes/02-api-relacion-movimientos.md` y
`docs/api/endpoints.md`.
