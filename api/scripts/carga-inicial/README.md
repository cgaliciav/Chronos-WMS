# Carga inicial de inventario de un cliente

Primer uso: **AMZ** (noviembre 2026). Convierte los reportes que entrega el cliente en un `carga.json` revisable y lo
sube al API con los mismos endpoints que usa el front, así que cada movimiento pasa por `MovimientoService`
(transacción, histórico, instantánea y relaciones). Los scripts no tienen dependencias propias: `generar.mjs` usa
`exceljs`, que ya está en `api/node_modules`, y `subir.mjs` solo usa Node ≥ 22.

> Los reportes, `carga.json`, `fotos/` y `estado-*.json` llevan precios, proveedores y folios fiscales del cliente:
> **no se versionan**. Guárdalos en la carpeta del proyecto del cliente, no en el repositorio.

## 1. Generar

```bash
cd api
node scripts/carga-inicial/generar.mjs \
  --entrada "~/Documents/Proyectos/2026 ChronosAMZ - Almancen/InventarioInicial" \
  --salida  "<carpeta>/carga-amz" \
  [--pdf-csv <transcripcion.csv> --pdf-fotos <carpeta de recortes>]
```

Lee los archivos que encuentre en `--entrada`:

| Archivo | Plantilla | Área | Proyecto | Listado de compra | Precio |
|---|---|---|---|---|---|
| `PCAT_*PRODUCCIÓN*.xlsx` | `# Inv. · Foto · Producto · Cantidad inicial · Valor compra · Total · Cantidad Actual · …` | PRODUCCIÓN | POR CATÁLOGO S1 | uno por proveedor y folio fiscal | el del reporte |
| `PCAT_*MAQUILLAJE*.xlsx` | igual | MAQUILLAJE Y PEINADO | POR CATÁLOGO S1 | uno por proveedor y folio fiscal | el del reporte |
| `VNTA_*PROPS*.xlsx` | `CAJA/PAQUETE · PROP · PERSONAJE · CONTINUIDAD · CANT · ORIGEN` | UTILERÍA | LA VENTA | uno, sin factura | $1 MXN por pieza |
| CSV del catálogo PDF | `pagina,seccion,num,titulo,cantidad,anotacion_manuscrita,confianza,notas,foto` | DECORACIÓN / UTILERÍA | EL NEGRO | uno, sin factura | $1 MXN por pieza |

El PDF de Bodega Cedro es un catálogo de fotos con anotaciones a mano, así que primero se transcribe a CSV.

### Movimientos de cada artículo (decisiones del propietario, 2026-11-17)

Todo entra a la bodega **BODEGA CEDRO** con **15 COMPRA**. La compra deja el artículo "en el proyecto" (no
disponible), así que cada artículo lleva después las operaciones que cubren exactamente lo comprado:

| Caso | Artículos | Operaciones |
|---|---|---|
| PCAT con `Cantidad Actual` = inicial, o sin cantidad actual | 1 con la cantidad inicial | 4 DEVOLUCIÓN de todo |
| PCAT con `Cantidad Actual` > inicial | 1 con la cantidad **inicial**; el excedente queda como aviso | 4 DEVOLUCIÓN de todo |
| PCAT con `Cantidad Actual` < inicial | **uno por pieza** (cantidad 1) | 4 DEVOLUCIÓN en las primeras *actual* piezas, 13 BAJA JUSTIFICADA en el resto |
| La Venta y catálogo PDF | 1 con la cantidad del reporte | 4 DEVOLUCIÓN de todo |

Las devoluciones y bajas van en listados propios, uno por proyecto y tipo, como "INVENTARIO INICIAL · POR CATÁLOGO S1 ·
DEVOLUCIÓN".

Los faltantes se dividen por pieza porque en Chronos **la baja es total**: deja el artículo en 0 y en estado `baja`
(`api/src/services/reglas/efectosInventario.ts`). Una baja parcial sobre un solo artículo borraría también las piezas
que sí existen.

En los artículos divididos, el total del reporte se reparte por pieza y la última pieza absorbe el redondeo, así que el
listado de compra suma exactamente el *Total* del reporte.

### Otras reglas

- Precio en PCAT: manda la columna *Total*, y el unitario es `Total / cantidad inicial`. Si no cuadra con
  `cantidad × Valor compra`, queda un aviso.
- El resto de las columnas se guardan como **características** del producto: folio, comprobación, personaje, estado,
  caja, cantidades inicial y actual, comentario, origen, continuidad, pieza *k de n* y el renglón de origen. Las fotos
  de la columna *Foto* se extraen a `fotos/`. Las piezas de un mismo renglón comparten foto.
- Los proveedores con dos nombres se unifican (`ALIAS_PROVEEDOR`). Si una celda trae dos folios, el artículo va en el
  listado del primero.
- Todo lo dudoso queda en `avisos` dentro de `carga.json`. Revísalo y corrige el JSON a mano si hace falta antes de
  subir.

## 2. Subir

```bash
node scripts/carga-inicial/subir.mjs --carga <carpeta>/carga-amz --simular        # valida y muestra el plan
CHRONOS_PASSWORD='…' node scripts/carga-inicial/subir.mjs \
  --api https://<host>/api --carga <carpeta>/carga-amz --usuario <correo> [--limite 10]
```

1. Catálogos: bodega, áreas, proyectos y proveedores. Los que ya existen con el mismo nombre se reutilizan.
2. Listados de compra: `POST /groups/new-purchase`, con factura, proveedor y tipo de factura (1 *Fiscal nacional*, o
   6 *Recibo / Comprobante* si no hay folio).
3. Listados de devolución y baja: `POST /groups/new-details`.
4. Por cada artículo:
   - `PUT /groups/activity-purchase` crea el producto, el inventario y la compra en una transacción, con un código
     autogenerado.
   - `POST /file/file` sube la foto.
   - `PUT /groups/activity` registra cada devolución o baja con el código del artículo. El API las relaciona con la
     compra (`movimiento_relacion`).

El usuario necesita el rol ADMINISTRADOR y una contraseña definitiva. Si el script se corta, vuelve a ejecutarlo:
lo hecho queda en `estado-<host>.json` y no se duplica. El script se niega a reanudar con un estado de **otra**
versión o generación de `carga.json`, para no mezclar cargas. Si el servidor se reinició, mueve ese archivo fuera de
la carpeta.

Comprobación tras subir (consulta a la base):

- No queda ninguna compra con saldo: `select count(*) from v_movimiento_saldo where saldo > 0` da 0.
- Las piezas devueltas son `sum(cantidad)` de `inventario_actual`.
- Los artículos con baja tienen `disponible = 'baja'`.

Después de subir, asigna la bodega y las áreas nuevas a los usuarios para que vean los listados.

## Volver a cargar AMZ staging desde cero

La carga es para una base nueva. Para repetirla en staging (modo `caddy-amz` de la VM, `infra/staging/README.md`):

1. La marca y el resto de `/configuracion` viven en la base, en la tabla `configuracion`. Para no perderlas, respáldalas
   antes de apagar. En la VM, en `~/chronos-amz` y con el stack encendido:

   ```bash
   docker compose -f compose.yml -f compose.staging.yml exec -T mariadb sh -c \
     'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --no-create-info --replace chronos_amz configuracion' \
     > configuracion-respaldo-$(date +%Y%m%d).sql
   ```

   El respaldo no necesita un token. `--replace` hace que, al restaurar, sus filas reemplacen las que crea la siembra.
   También puedes exportar la marca desde el API (`GET /config/export`) e importarla al final.
2. En la VM, en `~/chronos-amz`:
   - Apaga el stack: `docker compose -f compose.yml -f compose.staging.yml down`.
   - Aparta la base, sin borrarla: `mv db_data db_data.carga-v1-$(date +%Y%m%d)`.
   - Crea la carpeta vacía: `mkdir -p db_data/mysql`.
3. Desde `infra/staging`, ejecuta
   `./desplegar-caddy.sh amz --version-web <V> --version-api <V> --sembrar-admin <correo> --admin-nombre "<Nombre>"`
   con las versiones que ya corren. Las migraciones y la siembra crean el esquema, los catálogos y el administrador
   con contraseña temporal.
4. Restaura la configuración y reinicia el API, por si tiene la anterior en caché:

   ```bash
   docker compose -f compose.yml -f compose.staging.yml exec -T mariadb sh -c \
     'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" chronos_amz' < configuracion-respaldo-<AAAAMMDD>.sql
   docker compose -f compose.yml -f compose.staging.yml restart api
   ```

   Entra y cambia la contraseña temporal del administrador. `subir.mjs` no acepta una contraseña temporal.
5. Aparta el `estado-amz-stage.exogrid.xyz.json` anterior y ejecuta `subir.mjs`.

## Ensayo en local

Usa una base aparte en el contenedor de pruebas (`docker compose -f docker-compose.test.yml up -d --wait`):

```bash
docker exec almacen-api-test-mariadb-1 mariadb -uroot -proot -e "CREATE DATABASE almacen_carga CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON almacen_carga.* TO 'almacen_test'@'%';"
DB_DATABASE_NAME=almacen_carga npx ts-node src/test/resetDb.ts
ENV_FILE=.env.test DB_DATABASE_NAME=almacen_carga PORT_ALMACEN_API=4199 npx ts-node src/index.ts   # admin@pruebas.local / Admin123!
```

No uses `almacen_test`, porque `npm run test:int` la borra.
