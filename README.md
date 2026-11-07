# Chronos-WMS

Monorepo del sistema de almacén (WMS) de Teleset/Sony México.

| Carpeta  | Qué es | Origen | Commit base (master) |
|----------|--------|--------|----------------------|
| `api/`   | API REST (Node + Express + TypeORM + MariaDB) | almacen-api-v3 | `a27d147cc24f24efa54f44ef66569f2d902c7c82` (2026-01-30, "esto pertenece a la version 67") |
| `front/` | SPA React + Ant Design | almacen-front-v3-r1 | `bad60e8870cce56d3dd02fb5cd1eff856fa39395` (2025-03-06, "PRODUCTION version to 3.15.17") |
| `docs/`  | Documentación técnica, hallazgos y planes | — | — |

El historial previo vive en los repositorios originales; este repo arranca desde esos snapshots.

## Empezar

- API: ver [`api/README.md`](api/README.md). Front: ver [`front/README.md`](front/README.md).
- Documentación: [`docs/README.md`](docs/README.md). Guías para agentes de IA: `CLAUDE.md` (raíz, `api/`, `front/`).
- Fallos conocidos: [`docs/hallazgos-codigo.md`](docs/hallazgos-codigo.md).
- Planes de trabajo: [`docs/planes/`](docs/planes/).
