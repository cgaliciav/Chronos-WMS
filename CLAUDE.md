# Chronos-WMS · guía para agentes

Monorepo del sistema de almacén (WMS) de Teleset/Sony México. Dos aplicaciones independientes:

| Carpeta | Qué es | Guía propia |
|---|---|---|
| `api/` | API REST Node.js + Express 4 + TypeORM 0.2 + MariaDB (TypeScript) | `api/CLAUDE.md` |
| `front/` | SPA React 19 + antd 6 + Vite (TypeScript nuevo, JavaScript heredado) sobre la plantilla Clean UI, en migración (plan 01) | `front/CLAUDE.md` |
| `docs/` | Documentación técnica, hallazgos y planes de trabajo | `docs/README.md` |

No hay `node_modules` ni base de datos en este repositorio; cada app se instala y arranca por separado
(ver sus README). El historial previo al monorepo vive en los repos originales (`README.md` raíz).

## Reglas generales

- **Idioma:** código, comentarios, commits y documentación en **español** (los identificadores ya lo
  están: `Movimiento`, `InventarioActual`, `guardarConOperacion`). Las rutas HTTP están en inglés
  (`/groups`, `/current-inventory`); no las renombres sin coordinar con el front.
- **No cambies el esquema de base de datos a la ligera.** El API corre con `synchronize: true`; cualquier
  cambio en `api/src/entity` altera la BD de producción al arrancar. Sigue `docs/planes/02-api-relacion-movimientos.md`
  (migraciones) antes de tocar entidades.
- **Tipos de movimiento** (`movimiento_tipo`) tienen ids fijos y semántica propia: consulta
  `docs/api/tipos-de-movimiento.md` antes de tocar cualquier `switch` o comparación con 3, 4, 15…
- **Columnas `numeric`** llegan como `string` desde el driver. Convierte con `Number()` antes de operar.
- Las contraseñas y secretos van en `.env` (nunca versionado). `api/.env.example` y `front/.env.example`
  listan las variables.
- Antes de proponer una refactorización grande, revisa si ya está planificada en `docs/planes/`.

## Estado de la documentación

- `docs/decisiones.md`: decisiones tomadas por el propietario (Vite+npm, Zustand, TypeScript, sin tema
  oscuro, sin MagicBell ni Supabase, Sentry preparado, IP en el API, relación N:M, sin backfill). **No las reabras.**
- `docs/hallazgos-codigo.md`: fallos conocidos con archivo:línea y severidad. Si corriges uno, márcalo ahí.
- `docs/planes/01-front-actualizacion-antd.md`: plan por fases para Vite + React 19 + antd 6 y retirar Clean UI.
- `docs/planes/02-api-relacion-movimientos.md`: plan por fases para la relación origen→derivado entre
  movimientos, transacciones, migraciones y limpieza.

## Flujo de trabajo esperado

1. Lee el `CLAUDE.md` de la app que vas a tocar.
2. Si el cambio corresponde a una fase de un plan, sigue sus pasos y sus criterios de aceptación.
3. Ejecuta las pruebas de la app (`npm test` en `api/`; en `front/`, `npm run lint`, `npm run typecheck`,
   `npm test` y `npm run build`).
4. Commits pequeños y descriptivos en español; no mezcles cambios de `api/` y `front/` salvo que un
   cambio de contrato lo exija (y entonces documenta el contrato en `docs/api/endpoints.md`).
