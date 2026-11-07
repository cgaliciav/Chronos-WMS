# Pruebas del API

Dos suites de Jest (`api/jest.config.js`):

| Suite | Archivos | Necesita BD | Comando |
|---|---|---|---|
| `unit` | `src/**/*.test.ts` (excepto `*.int.test.ts`) | No | `npm run test:unit` |
| `integration` | `src/**/*.int.test.ts` | Sí (MariaDB de `.env.test`) | `npm run test:int` |

`npm test` ejecuta ambas. `npm run typecheck` ejecuta `tsc --noEmit`.

## Base de datos de pruebas

Configuración en `api/.env.test` (versionado, sin secretos reales): `almacen_test` en `127.0.0.1:3307`,
usuario `almacen_test` / `almacen_test`. Las variables ya presentes en el entorno tienen prioridad, así
que en CI basta exportar `DB_HOST`, `DB_PORT`, etc.

**Con Docker** (recomendado):
```bash
cd api
npm run test:int:up      # docker compose -f docker-compose.test.yml up -d --wait
npm run test:int
npm run test:int:down    # borra el volumen
```

**Sin Docker** (MariaDB ≥ 10.11 instalado localmente):
```bash
mariadb -uroot -e "CREATE DATABASE IF NOT EXISTS almacen_test CHARACTER SET utf8mb4;
  CREATE USER IF NOT EXISTS 'almacen_test'@'%' IDENTIFIED BY 'almacen_test';
  GRANT ALL ON almacen_test.* TO 'almacen_test'@'%'; FLUSH PRIVILEGES;"
```
y ajusta `DB_PORT` si tu servidor no escucha en 3307 (`DB_PORT=3306 npm run test:int`).

`npm run test:int` ejecuta primero `src/test/resetDb.ts`, que **borra el esquema y lo recrea ejecutando las
migraciones** (`dropSchema` + `runMigrations`; desde la fase 3 ya no se usa `synchronize`), **falla si las
migraciones no reproducen exactamente las entidades** (el mismo cálculo que `migration:generate`) y siembra el catálogo mínimo (`src/test/seed.ts`): los 17 tipos de
movimiento con sus ids de producción, roles `ADMINISTRADOR` / `GRUPOS-MOVIMIENTONUEVO` /
`GRUPOS-LISTADETALLE`, usuarios `admin@pruebas.local` (`Admin123!`) y `operador@pruebas.local`
(`Operador123!`), sus sesiones (ids 1 y 2), área, bodega, tres proyectos (A, B y uno externo),
proveedor, tipos de factura, tipos de precio, tipo de producto y parámetros de depreciación.
Los ids fijos están en `SEMILLA`.

> Nunca apuntes `.env.test` a una base real: `resetDb.ts` la destruye.

## Suites existentes

| Archivo | Qué cubre |
|---|---|
| `src/test/humo.int.test.ts` | arranque, login, token, roles |
| `src/test/caracterizacion.int.test.ts` | escenarios de negocio (compra, alta, préstamo, devolución, deshacer, concurrencia, listados, edición, IP). Desde la fase 3 deshacer el penúltimo y la concurrencia se comprueban en estricto |
| `src/test/relaciones.int.test.ts` | fase 3: relaciones origen→derivado, saldos, FIFO, `strict`, transferencias, deshacer con derivados, compras/bajas, modo de compatibilidad con legados, listado de pendientes, atomicidad, edición de proyecto |
| `src/services/reglas/*.test.ts`, `src/services/resolverRelaciones.test.ts`, `src/helpers/cacheArchivos.test.ts` | unitarias de los efectos sobre el inventario (17 tipos, 100 % de ramas), del planificador de relaciones con datos simulados y del caché de archivos |
| `src/test/seguridad.int.test.ts` | fase 2: archivos con token y sin recorrido de rutas, contraseñas, rate limit, inyección en filtros/orden/búsquedas, validación zod, promesas esperadas, 501; fase 3: revocación del token al cerrar sesión |
| `src/helpers/*.test.ts`, `src/esquemas/index.test.ts`, `src/middlewares/manejoErrores.test.ts` | unitarias de los helpers de seguridad y validación |

## Escribir pruebas

- **Unitarias**: sin TypeORM. Si el módulo bajo prueba importa controladores, mockea
  `../controllers/LogGeneral.Controller` como en `src/middlewares/manejoErrores.test.ts`.
- **Integración**: importa `./env` primero, abre la conexión con `conectarPruebas()` en `beforeAll`,
  ciérrala con `cerrarPruebas` en `afterAll`, y construye la app con `crearApp()` (`src/app.ts`, sin `listen`).
  Usa las fábricas de `src/test/factories.ts`:
  - `clienteAdmin(app)` / `clienteOperador(app)`: cliente `supertest` con la cabecera `auth` ya firmada.
  - `crearGrupoCompra`, `crearGrupoDetalle(tipo)`, `crearArticulo({ grupoId, cantidad, movimientoTipoId })`,
    `registrarOperacion({ codigo, cantidad, movimientoTipoId, grupoId })`.
  - `inventarioDe(id)` y `movimientosDe(id)` leen la BD con los numéricos convertidos a `number`.
  - `codigoUnico()` y `nombreUnico()` evitan colisiones con las restricciones `UNIQUE`.
- Cada prueba crea sus propios artículos; no dependas de datos creados por otra prueba. La suite corre
  en serie (`--runInBand`) porque comparte una sola BD.
- Para documentar un comportamiento erróneo que aún no se corrige usa `it.failing` (pasa a rojo cuando
  alguien lo arregle, lo que obliga a actualizar la prueba).

## Por qué no hay `globalSetup`

Con `--runInBand`, un `globalSetup` carga las entidades con el `require` de Node mientras las pruebas
las cargan con el runtime de Jest: TypeORM las registra dos veces y falla con
`Index contains column that is missing in the entity`. Por eso el reinicio de la BD es un script
previo (`resetDb.ts`) y la conexión de pruebas usa la lista explícita `ENTIDADES` de `src/entity/index.ts`.

## CI

`.github/workflows/api.yml` levanta `mariadb:10.11` como servicio y ejecuta `typecheck`, `test:unit` y
`test:int` en cada push o PR que toque `api/**`.
