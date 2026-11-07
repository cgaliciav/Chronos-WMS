# Documentación técnica · Chronos-WMS

| Documento | Contenido |
|---|---|
| [`api/modelo-de-datos.md`](api/modelo-de-datos.md) | Entidades TypeORM, diagrama ER, convenciones y cómo se encadenan hoy los movimientos |
| [`api/tipos-de-movimiento.md`](api/tipos-de-movimiento.md) | Los 17 tipos de movimiento, su efecto sobre el inventario y su clasificación |
| [`api/pruebas.md`](api/pruebas.md) | Cómo ejecutar y escribir las pruebas unitarias e integración del API |
| [`api/endpoints.md`](api/endpoints.md) | Catálogo de rutas HTTP con roles y controladores |
| [`front/arquitectura.md`](front/arquitectura.md) | Stack, estructura, flujo de autenticación y convenciones del front |
| [`decisiones.md`](decisiones.md) | Decisiones del propietario que fijan el alcance de los planes |
| [`hallazgos-codigo.md`](hallazgos-codigo.md) | Fallos encontrados (API y front) con severidad, archivo:línea y evidencia |
| [`planes/01-front-actualizacion-antd.md`](planes/01-front-actualizacion-antd.md) | Plan por fases: Vite 8 + TypeScript, React 19, React Router 8, Zustand, antd 6, retirar Clean UI, pruebas |
| [`planes/02-api-relacion-movimientos.md`](planes/02-api-relacion-movimientos.md) | Plan por fases: relación origen→derivado entre movimientos, transacciones, migraciones, limpieza, actualización de dependencias, notificaciones propias, pruebas |

Guías para agentes: [`/CLAUDE.md`](../CLAUDE.md), [`/api/CLAUDE.md`](../api/CLAUDE.md), [`/front/CLAUDE.md`](../front/CLAUDE.md).
