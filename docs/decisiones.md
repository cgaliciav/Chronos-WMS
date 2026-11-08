# Decisiones del propietario (2026-11-07)

Respuestas de César Galicia a las dudas planteadas tras la auditoría. Son vinculantes para los planes
`docs/planes/01-*.md` y `02-*.md`; quien los ejecute no debe reabrirlas.

| # | Tema | Decisión | Aplicación |
|---|---|---|---|
| 1 | Tooling front | **Vite** y **npm** (dejar Yarn 1 y CRA). | Plan 01 D1, D3, fase 2 |
| 2 | Estado front | **Zustand** (sustituye redux + redux-saga + connected-react-router). | Plan 01 D6, fase 3 |
| 3a | Tema oscuro | **No requerido**: solo tema claro; se elimina el toggle y el store de tema. | Plan 01 D10 |
| 3b | MagicBell | **Se elimina.** Se desarrollará un **sistema de notificaciones propio** (API + campana en el front). | Plan 02 fase 7; plan 01 D14 |
| 3c | IP del cliente | **Sí se necesita**, pero obtenida **en el API** (`req.ip` con `trust proxy`), no vía `api.ipify.org` desde el navegador. | Plan 02 fase 2 paso 4; plan 01 D15 |
| 4 | TypeScript | **Migrar a la par** del resto del plan del front. | Plan 01 D13, fases 2, 3 y 6 |
| 5 | Relación entre movimientos | **Una devolución puede cubrir varios préstamos** → relación **N:M** (`movimiento_relacion` con cantidad por par). | Plan 02 §2.1 |
| 6 | Backfill | **Solo movimientos nuevos**; no se relacionan los históricos. Respaldo de BD disponible más adelante. | Plan 02 regla 8 (modo de compatibilidad) |
| 7a | Sentry | **Dejar preparado** (API y front), activo solo si hay DSN. | Plan 02 fase 2 paso 11; plan 01 D16 |
| 7b | Supabase | **Se quita** (código y dependencia). | Plan 02 fases 3 y 4 |
| 8 | Comportamientos dudosos (`nuevoConInventario` sin filtro de bodega; tipos 15/5 que envía el front) | **Revisar sobre la marcha.** | Plan 02 §7 |
| 9 | API de pruebas para e2e | **No existe.** Los e2e del front usan MSW; el `docker-compose.test.yml` del plan 02 fase 0 será la primera API de pruebas. | Plan 01 D18; plan 02 fase 0 |
| 10 | Inventario físico por grupos (`POST /groups/new-inventory` y afines) | **Se elimina** (2026-11-08): nunca se terminó ni se usó. Se conserva la tabla `inventario_detalle` por los datos existentes. | Plan 02 §7; `api/endpoints.md` |
