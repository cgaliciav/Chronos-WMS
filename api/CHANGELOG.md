# Changelog · API

Cambios notables del API de Chronos-WMS. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y la numeración, las reglas de versionado del [`CLAUDE.md` raíz](../CLAUDE.md): `vX.Y.Z`; **mayor** para cambios
drásticos de objetivo, lenguaje o stack; **menor** para capacidades, pautas o herramientas nuevas; **parche** para
correcciones y aclaraciones; sufijo `-d` en desarrollo y `-s` en staging.

La versión vive en `package.json` (la devuelven `GET /` y `/auth/version`, y Sentry la usa como `release`).
`desplegar.sh` publica una versión `X.Y.Z-d` como `X.Y.Z` y, si ya no lleva sufijo, sube el parche. Contrato con el
front: [`docs/api/endpoints.md`](../docs/api/endpoints.md). Plan: [`docs/planes/02-api-relacion-movimientos.md`](../docs/planes/02-api-relacion-movimientos.md).

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
