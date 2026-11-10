# Chronos-WMS · guía para agentes

Monorepo del sistema de almacén (WMS) de Teleset/Sony México. Dos aplicaciones independientes:

| Carpeta | Qué es | Guía propia |
|---|---|---|
| `api/` | API REST Node.js + Express 5 + TypeORM 0.2 + MariaDB (TypeScript) | `api/CLAUDE.md` |
| `front/` | SPA React 19 + antd 6 + Vite, 100 % TypeScript (plan 01: falta la fase 7, pruebas e2e y CI) | `front/CLAUDE.md` |
| `docs/` | Documentación técnica, hallazgos y planes de trabajo | `docs/README.md` |

No hay `node_modules` ni base de datos en este repositorio; cada app se instala y arranca por separado
(ver sus README). El historial previo al monorepo vive en los repos originales (`README.md` raíz).

## Reglas generales

- **Idioma:** código, comentarios, commits y documentación en **español** (los identificadores ya lo
  están: `Movimiento`, `InventarioActual`, `guardarConOperacion`). Las rutas HTTP están en inglés
  (`/groups`, `/current-inventory`); no las renombres sin coordinar con el front.
- **No cambies el esquema de base de datos a la ligera.** Desde la fase 3 del plan 02 el esquema lo cambian las
  migraciones (`api/src/migration/`, `DB_SYNCRO=false`): todo cambio en `api/src/entity` necesita su migración
  (`npm run migration:generate -- Nombre`) y `npm run test:int` falla si falta. En producción las aplica una persona
  siguiendo `docs/api/procedimiento-migracion-produccion.md`.
- **Tipos de movimiento** (`movimiento_tipo`) tienen ids fijos y semántica propia: consulta
  `docs/api/tipos-de-movimiento.md` antes de tocar cualquier `switch` o comparación con 3, 4, 15…
- **Columnas `numeric`** llegan como `string` desde el driver. Convierte con `Number()` antes de operar.
- Las contraseñas y secretos van en `.env` (nunca versionado). `api/.env.example` y `front/.env.example`
  listan las variables.
- Antes de proponer una refactorización grande, revisa si ya está planificada en `docs/planes/`.

## Versionado (obligatorio en `api/` y `front/`)

Cada app lleva su propia versión en su `package.json`. Reglas que **siempre** se siguen:

1. El formato es siempre **`vX.Y.Z`**: en tags, changelogs, commits y comunicación. En `package.json` se guarda sin la
   `v` (`"version": "4.0.0"`) porque npm no la admite.
2. **Mayor (`vX.0.0`)**: cambios drásticos en la personalidad, el objetivo principal, el lenguaje o el stack utilizado.
3. **Menor (`v0.Y.0`)**: adición de nuevas capacidades, pautas o integración de una nueva herramienta.
4. **Parche (`v0.0.Z`)**: corrección de errores, ajuste de tono o aclaración de funcionamiento.

Sufijo según el entorno:

- **Desarrollo:** termina en **`-d`**, p. ej. `v4.0.0-d`.
- **Staging:** termina en **`-s`**, p. ej. `v2.80.0-s`.
- **Producción:** sin sufijo, p. ej. `v4.0.0`.

Al subir Mayor se reinician Menor y Parche (`v2.80.3` → `v3.0.0`); al subir Menor se reinicia Parche. Cambia la versión
con `npm version X.Y.Z --no-git-tag-version` (o `X.Y.Z-d` / `X.Y.Z-s`) para que `package.json` y `package-lock.json`
queden iguales, y anota el cambio en el changelog de la app (`front/CHANGELOG.md`). Elige el nivel por el cambio más
grande que incluya la versión.

## Estado de la documentación

- `docs/decisiones.md`: decisiones tomadas por el propietario (Vite+npm, Zustand, TypeScript, sin tema
  oscuro, sin MagicBell ni Supabase, Sentry preparado, IP en el API, relación N:M, sin backfill). **No las reabras.**
- `docs/hallazgos-codigo.md`: fallos conocidos con archivo:línea y severidad. Si corriges uno, márcalo ahí.
- `docs/planes/01-front-actualizacion-antd.md`: plan por fases para Vite + React 19 + antd 6 y retirar Clean UI.
- `docs/planes/02-api-relacion-movimientos.md`: plan por fases para la relación origen→derivado entre
  movimientos, transacciones, migraciones y limpieza. Fases 0-5 hechas; la siguiente es la 6 (TypeORM 1.x).

## Flujo de trabajo esperado

1. Lee el `CLAUDE.md` de la app que vas a tocar.
2. Si el cambio corresponde a una fase de un plan, sigue sus pasos y sus criterios de aceptación.
3. Ejecuta las pruebas de la app (`npm test` en `api/`; en `front/`, `npm run lint`, `npm run typecheck`,
   `npm test` y `npm run build`).
4. Commits pequeños y descriptivos en español; no mezcles cambios de `api/` y `front/` salvo que un
   cambio de contrato lo exija (y entonces documenta el contrato en `docs/api/endpoints.md`).
