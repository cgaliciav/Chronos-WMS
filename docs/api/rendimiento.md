# Rendimiento del API (plan 02 · fase 4)

## Cómo se mide

`cd api && npm run rendimiento` (`src/test/rendimiento.ts`): recrea la BD de `.env.test`, siembra artículos con alta
(300 por defecto), préstamos sobre la mitad y devoluciones sobre una cuarta parte, y mide con **autocannon**
(10 conexiones) los cinco endpoints de lectura más usados. También cuenta las consultas SQL de una petición.
Variables: `DURACION` (segundos por endpoint; el plan pide 30, aquí se usaron 10 en ambas mediciones para
compararlas) y `ARTICULOS`.

Entorno de las mediciones: contenedor de desarrollo, MariaDB 10.11 local, misma máquina para el API y la BD. Los
valores absolutos dependen de la máquina; lo que importa es la comparación antes/después con la misma carga.

## Resultados

req/s (más es mejor) · p50 y p99 en ms · consultas SQL por petición. 300 artículos, 10 s, 10 conexiones, 0 errores
en todas las mediciones.

| Endpoint | Antes (Node 22) | Después (Node 22) | Después (Node 24) | Consultas antes → después |
|---|---|---|---|---|
| `POST /groups/list-antd` | 29 · p50 339 · p99 529 | 96 · p50 101 · p99 216 | 126 · p50 76 · p99 186 | 6 → 5 |
| `POST /groups/activity-list-by-group` | 28 · p50 351 · p99 474 | 70 · p50 142 · p99 205 | 91 · p50 107 · p99 155 | 6 → 6 |
| `POST /groups/active-activity-list` | 24 · p50 404 · p99 527 | 73 · p50 136 · p99 270 | 93 · p50 107 · p99 146 | 7 → 6 |
| `GET /activity/:id` | 63 · p50 155 · p99 244 | 246 · p50 40 · p99 61 | 286 · p50 34 · p99 53 | 4 → 4 |
| `POST /current-inventory/list-catalog-general` | 189 · p50 51 · p99 77 | 468 · p50 21 · p99 32 | 567 · p50 17 · p99 29 | 4 → 4 |

"Antes" = commit `b63add4` (cierre de la fase 3). "Después" = cierre de la fase 4.

## Qué se encontró y qué se cambió

1. **CPU en TypeORM, no en la BD.** Una petición aislada de un listado tardaba ~30 ms, pero con 10 conexiones la
   latencia subía a ~340 ms: el proceso de Node estaba saturado. `node --cpu-prof` mostró que
   `QueryBuilder.replacePropertyNames` (y su `escapeRegExp`) se llevaba la mayor parte del tiempo: TypeORM 0.2
   reconstruye en cada consulta, para cada alias, un mapa con todas las columnas de la entidad y una expresión
   regular con todas ellas. Los listados tienen 20-30 joins.
   → `api/src/helpers/parcheTypeorm.ts` guarda ese mapa y esa expresión por metadatos y prefijo. El SQL generado es
   idéntico (`src/test/parcheTypeorm.int.test.ts` compara todas las consultas de 10 endpoints con y sin parche).
   Se retira al pasar a TypeORM 1.x (fase 6), que ya construye la expresión una sola vez.
2. **COUNT repetido.** Los listados contaban dos veces aunque no hubiera filtros (total y filtrado). Ahora el segundo
   `COUNT` solo se ejecuta si hay filtros.
3. **Driver `mysql2`** en lugar de `mysql` (paso 2) y **Node 24** (paso 8) aportan el resto.
4. **Relaciones `eager`.** No se quitaron: los listados y `GET /activity/:id` usan QueryBuilder, que no carga
   relaciones `eager`, y el detalle ya hace 4 consultas (objetivo del plan: < 10). Quitarlas cambiaría el JSON que
   consumen otras pantallas del front sin pruebas que lo cubran; se revisará con la migración del front (plan 01).

## Lo que queda

- Tras el parche, el tiempo de los listados es sobre todo espera de la BD y escritura de la respuesta.
  `active-activity-list` recorre la vista `v_movimiento_saldo`; si crece mucho, el siguiente paso es materializar el
  saldo o añadir un índice compuesto `movimiento(inventarioActualId, legado)`.
- `checkRole` consulta el usuario con sus roles y áreas en cada petición (2 consultas); una caché corta lo reduciría.
