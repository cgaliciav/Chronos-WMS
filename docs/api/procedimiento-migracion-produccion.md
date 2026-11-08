# Procedimiento: aplicar migraciones en producción

Desde la fase 3 del plan 02 el esquema de la base de datos **solo lo cambian las migraciones**
(`api/src/migration/`). `synchronize` queda desactivado (`DB_SYNCRO=false`). Este documento es para la
persona que despliega: **ninguna sesión automatizada ejecuta migraciones contra producción**.

## Migraciones existentes

| Migración | Qué hace | ¿Se revierte? |
|---|---|---|
| `1794083852310-Baseline` | Esquema completo al cierre de la fase 2. **Idempotente:** si la tabla `movimiento` ya existe (producción, creada con `synchronize`) solo queda registrada en la tabla `migrations` y no ejecuta nada. | **No** (`down` lanza un error: borraría todas las tablas). |
| `1794084035404-MovimientoRelacion` | Crea `movimiento_relacion` y la vista `v_movimiento_saldo`; añade `movimiento.fecha`, `movimiento.legado` e `inventario_actual_historico.movimientoId`. Marca **todos** los movimientos existentes con `legado = 1` y rellena su `fecha` con la de su operación (o la de su primer grupo). No crea relaciones para los movimientos históricos (decisión 6, sin backfill). | Sí (`migration:revert`): borra la tabla, la vista y las columnas, **y con ellas las relaciones registradas desde el despliegue**. |

La paridad de la baseline se comprobó así: sobre una base creada con `synchronize` con las entidades de la
fase 2, la baseline no ejecuta nada y el generador no encuentra diferencias. Cada `npm run test:int` vuelve a
comprobar que las migraciones, aplicadas sobre una base vacía, reproducen exactamente las entidades.

## Antes de empezar

1. El usuario de la BD que ejecute las migraciones necesita `CREATE`, `ALTER`, `INDEX`, `REFERENCES`,
   `CREATE VIEW` y `DROP` sobre la base. La vista se crea con `SQL SECURITY INVOKER`, así que la puede
   consultar el usuario de la aplicación aunque la cree otro.
2. **Quita `DB_SYNCRO=true` del archivo de secretos** (`~/teleset-almacen*/api-secrets.env`) o cámbialo a
   `false`. La imagen ya trae `DB_SYNCRO=false`, pero `--env-file` lo sobrescribe. Si el API nuevo arrancara
   con `synchronize`, crearía las tablas nuevas **sin** marcar los movimientos legados ni la vista, y la
   migración fallaría después.
3. Ten a mano una ventana de mantenimiento corta: la migración `MovimientoRelacion` recorre la tabla
   `movimiento` (dos `UPDATE`) y añade columnas; en tablas grandes puede tardar minutos.

## Pasos

Desde la fase 4 la imagen solo contiene el código compilado (sin ts-node): las migraciones se ejecutan con
`node build/migrar.js show|run|revert`. `./desplegar.sh pruebas|produccion` (o `deploy*.sh`) ya **se detiene si hay
migraciones pendientes**; sigue estos pasos a mano para aplicarlas y vuelve a desplegar.

```bash
# 0. Variables (ajústalas)
VERSION=2.64.0                          # etiqueta de la imagen nueva
SECRETOS=~/teleset-almacen/api-secrets.env
RED=teleset-almacen_default
MARIADB=teleset-almacen-mariadb-1       # contenedor de MariaDB
BD=almacen_sony_migracion

# 1. Respaldo completo (estructura + datos + vistas + rutinas)
docker exec "$MARIADB" sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers '"$BD" \
  | gzip > respaldo-$BD-$(date +%Y%m%d-%H%M).sql.gz
ls -lh respaldo-*.sql.gz                # comprueba que no esté vacío

# 2. Construir la imagen nueva (como hace deploy-production.sh) SIN detener todavía el API actual
docker build -t almacen-backend:$VERSION .

# 3. Ver qué migraciones faltan (sale con código 1 si hay pendientes)
docker run --rm --env-file "$SECRETOS" -e DB_SYNCRO=false --network "$RED" almacen-backend:$VERSION node build/migrar.js show
#    [ ] Baseline1794083852310
#    [ ] MovimientoRelacion1794084035404

# 4. Detener el API actual (nadie debe escribir durante la migración)
docker stop almacen-backend-1

# 5. Aplicar las migraciones
docker run --rm --env-file "$SECRETOS" -e DB_SYNCRO=false --network "$RED" almacen-backend:$VERSION node build/migrar.js run

# 6. Consultas de control (ver abajo). Si algo no cuadra: rollback.

# 7. Arrancar el API nuevo
docker rm almacen-backend-1
sudo chown -R 1000:1000 ~/teleset-almacen/exogrid   # la imagen corre como el usuario node (uid 1000)
docker run -d --restart unless-stopped --env-file "$SECRETOS" -e DB_SYNCRO=false --name almacen-backend-1 -p 34400:4200 \
  -v ~/teleset-almacen/exogrid:/code/exogrid --network "$RED" almacen-backend:$VERSION
docker logs -f almacen-backend-1        # no debe aparecer "hay migraciones pendientes" ni "DB_SYNCRO=true"
```

## Consultas de control

```sql
-- Las dos migraciones registradas
SELECT name FROM migrations ORDER BY id;

-- Tabla y vista nuevas
SHOW CREATE TABLE movimiento_relacion;
SHOW CREATE VIEW v_movimiento_saldo;
SELECT COUNT(*) FROM movimiento_relacion;                        -- 0 justo después de migrar

-- Todos los movimientos existentes quedaron como legados y con fecha
SELECT legado, COUNT(*) FROM movimiento GROUP BY legado;         -- solo legado = 1
SELECT COUNT(*) FROM movimiento m JOIN operacion o ON o.id = m.operacionId
 WHERE m.fecha <> o.fecha;                                       -- 0

-- La vista responde y usa índices
EXPLAIN SELECT * FROM v_movimiento_saldo WHERE inventarioActualId = 1;

-- Columna del histórico (vacía para lo anterior)
SELECT COUNT(*) FROM inventario_actual_historico WHERE movimientoId IS NOT NULL;   -- 0
```

Tras arrancar, registra un préstamo y su devolución de prueba y comprueba que aparecen en
`movimiento_relacion` y que `GET /activity/<id>/chain` devuelve el saldo esperado.

## Rollback

- **Antes de arrancar el API nuevo** (o si nadie ha operado todavía): con la imagen nueva,
  `node build/migrar.js revert` deshace `MovimientoRelacion` (la baseline no se revierte; no hace falta). Después
  vuelve a arrancar la imagen anterior **con `DB_SYNCRO=false`**: con `synchronize` la imagen anterior intentaría
  ajustar el esquema por su cuenta.
- **Si la migración falló a medias**: MariaDB confirma cada sentencia DDL por separado, así que una migración
  interrumpida puede dejar cambios parciales. Restaura el respaldo:
  ```bash
  gunzip -c respaldo-<fecha>.sql.gz | docker exec -i "$MARIADB" sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" '"$BD"
  ```
- **Si ya hubo operación con el API nuevo**: `migration:revert` borra las relaciones registradas desde entonces.
  Los movimientos, operaciones e inventarios se conservan (las devoluciones posteriores quedarán como movimientos
  sin relación, como los legados).

## Migraciones futuras

1. Cambia las entidades en `api/src/entity`.
2. Con la BD de pruebas levantada: `npm run migration:generate -- NombreDelCambio` (ejecuta las migraciones
   existentes sobre la BD de `.env.test` y escribe la diferencia en `src/migration/<timestamp>-NombreDelCambio.ts`).
3. Revisa el archivo, añade las actualizaciones de datos necesarias y regístralo en `src/migration/index.ts`.
4. `npm run test:int` falla si las migraciones no reproducen las entidades.
5. En producción, repite los pasos de este documento.
