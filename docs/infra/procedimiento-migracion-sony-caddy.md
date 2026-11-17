# Procedimiento: migrar Sony (producción) a la versión actual y a Caddy

Lleva `linode-prod` de API 2.63.67 + front CRA detrás de dos nginx a `exogrid/chronos-api` + `exogrid/chronos-web`
(Caddy) con el stack de `infra/clientes/compose.yml`. Se hace en **tres pasos con verificación entre ellos**, para saber
en cuál falló algo:

| Paso | Cambia | No cambia | Vuelta atrás |
|---|---|---|---|
| 1. Versión | Esquema (5 migraciones), API 2.89.0, front 4.10.0, marca de Sony | nginx del host, certificados, MariaDB 10.3 | Restaurar el dump + stack anterior |
| 2. Caddy | Servidor web: Caddy sustituye a los dos nginx; certificado por DNS-01 de Linode | Datos, versión de la app | Apagar Caddy, encender nginx + paso 1 |
| 3. MariaDB | 10.3 → 10.11 | Todo lo demás | Copia en frío del directorio de datos |

Convenciones: `<…>` es un valor que decides tú y **nunca** se escribe en el repositorio. "(laptop)" = máquina del
propietario, en la raíz del repo; lo demás, en `ssh linode-prod`. Sustituye `2.89.0` y `4.10.0` si hay versiones más nuevas.
Ninguna sesión automatizada ejecuta estos pasos contra producción: los ejecuta una persona.

## Estado de partida (leído el 2026-11-14)

- `~/teleset-almacen` con docker-compose **v1** (1.29.2; no hay `docker compose` v2): `mariadb:10.3` (**publicada en
  `0.0.0.0:3308`**), `almacen-backend:2.63.67` (34400) y `nginx:1.25-alpine` + `front-www/` (34401).
- **No hay archivo de secretos**: `JWTSECRET`, `DB_USER` y `DB_PASSWORD` van horneados en la imagen, que además trae
  `DB_SYNCRO=true`.
- nginx del host con certbot. Además de `www.telesetalmacen.com` declara `stage.` y `v3.telesetalmacen.com`,
  `jdv3.exogrid.xyz`, `lib-arg-2.exolog.app`, `*.exogrid.xyz` y `*.exolog.app`, cuyos destinos ya no escuchan.
  **Decisión del propietario (2026-11-14): se retiran todos** al apagar nginx en el paso 2.
- `exogrid/` tiene las cinco carpetas que el API necesita (`archivos`, `reportes`, `uploads`, `auxiliares`,
  `imgproductos`), con dueño uid 1000. El volumen tapa las que crea la imagen: **si falta alguna, el API falla** al
  subir archivos o generar reportes.
- **No hay acceso `root` a MariaDB** (comprobado el 2026-11-16): `root@localhost` exige el plugin `unix_socket`, que esta
  10.3 no tiene cargado, y por TCP no se conoce la contraseña. Los pasos 0 a 2 usan `almacen_usr`, que tiene
  `ALL PRIVILEGES` sobre `almacen_sony_migracion` (alcanza para el dump, las migraciones y borrar/crear la base en el
  rollback). El paso 3 sí necesita `root`.
- `sudo` pide contraseña: los comandos con `sudo` de este documento los teclea una persona en una terminal.
- Disco: 66 GB libres (el dump comprimido ocupa ~31 GB).

## Paso 0. Preparación (sin tocar el servicio)

1. **Ensayo completo en la VM `chronos-ensayo`** (sección "Ensayo") con resultado correcto, y sus tiempos anotados aquí.
2. **Imágenes de producción** (laptop). Si la etiqueta ya existe (se promovió para AMZ), `promover.sh` falla: úsala tal cual.

   ```bash
   infra/imagenes/promover.sh api 2.89.0
   infra/imagenes/promover.sh web 4.10.0
   ```

3. **Compose v2 y acceso a Docker Hub** en el servidor:

   ```bash
   sudo apt-get update && sudo apt-get install -y docker-compose-v2
   docker compose version                 # v2; docker-compose v1 sigue instalado
   docker login -u exogrid                # token de solo lectura
   docker pull exogrid/chronos-api:2.89.0 && docker pull exogrid/chronos-web:4.10.0
   ```

4. **`.env` del stack nuevo.** (laptop) `scp infra/clientes/sony/.env.caddy.example linode-prod:~/chronos-sony.env.tmp`; en el servidor:

   ```bash
   mkdir -p ~/chronos-sony && mv ~/chronos-sony.env.tmp ~/chronos-sony/.env && chmod 600 ~/chronos-sony/.env
   # Credenciales de la base que usa hoy el API (se imprimen en tu terminal: no las pegues en ningún chat)
   docker inspect teleset-almacen_backend_1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^DB_(USER|PASSWORD)='
   nano ~/chronos-sony/.env
   ```

   | Variable | Valor |
   |---|---|
   | `ENTORNO` | `produccion` |
   | `IMAGEN_WEB` / `IMAGEN_API` | `exogrid/chronos-web:4.10.0` / `exogrid/chronos-api:2.89.0` |
   | `MARIADB_IMAGEN` | `mariadb:10.3` (cambia en el paso 3) |
   | `DATOS_DIR` | `/home/cesargv/teleset-almacen` |
   | `DB_PUERTO_LOCAL` | `3308` |
   | `DB_USER` / `DB_PASSWORD` | los de la imagen actual (comando de arriba) |
   | `DB_ROOT_PASSWORD` | la contraseña root actual de MariaDB |
   | `JWTSECRET` | **nuevo** (`openssl rand -base64 32`): todos vuelven a iniciar sesión, que de todos modos ocurre al cambiar de front |
   | `CONFIG_CLAVE` | `openssl rand -base64 32`; guárdala fuera del servidor |
   | `ARCHIVOS_PUBLICOS` | `true` |
   | `SMTP_USER` / `SMTP_PASS` | credenciales de Postmark (hoy van dentro del código viejo) |
   | `DOMINIOS` | `www.telesetalmacen.com` |
   | `DNS_PROVEEDOR` / `DNS_TOKEN` | `linode` / token con *Domains: Read/Write* |
   | `DNS_PROPAGACION_ESPERA` / `DNS_PROPAGACION_LIMITE` | `5m` / `-1` (descomentadas). Los servidores de nombres de Linode tardan minutos en coincidir: con los valores por defecto el reto DNS-01 falla (ver "Ensayo") |
   | `ACME_EMAIL` | correo de contacto de Let's Encrypt; `ACME_CA` comentada |

   Sin comillas en los valores. No debe existir `SMTP_ANULAR`.
5. **Archivos del paso 1** (laptop):

   ```bash
   scp infra/clientes/sony/compose.paso1.yml linode-prod:~/teleset-almacen/
   scp front/nginx.conf linode-prod:~/teleset-almacen/front-nginx.conf
   ```

   Y en el servidor, el build del front que trae la imagen web:

   ```bash
   cd ~/teleset-almacen
   docker create --name web-tmp exogrid/chronos-web:4.10.0 && docker cp web-tmp:/srv ./front-nuevo && docker rm web-tmp
   find front-nuevo -name '*.map' -delete      # los sourcemaps no se publican (Caddy los bloquea; este nginx no)
   ls front-nuevo/index.html front-nuevo/sw.js
   ```

6. **Comprobaciones previas** (servidor):

   ```bash
   cd ~/teleset-almacen
   for d in archivos reportes uploads auxiliares imgproductos; do stat -c '%n %u' exogrid/$d; done   # las cinco, uid 1000
   df -h / | tail -1                                         # > 40 GB libres
   DBPW="$(grep -E '^DB_PASSWORD=' ~/chronos-sony/.env | cut -d= -f2-)"    # contraseña de almacen_usr (no se muestra)
   docker exec -e MYSQL_PWD="$DBPW" teleset-almacen_mariadb_1 mysql -ualmacen_usr -e "SHOW GRANTS"
   docker exec -e MYSQL_PWD="$DBPW" teleset-almacen_mariadb_1 mysql -ualmacen_usr -N -e "SHOW CREATE DATABASE almacen_sony_migracion"
   ```

   Anota el juego de caracteres de la base (en producción, el 2026-11-16: `latin1` / `latin1_spanish_ci`): lo necesita el rollback del paso 1.

   El usuario del API necesita `CREATE`, `ALTER`, `INDEX`, `REFERENCES`, `CREATE VIEW` y `DROP` sobre
   `almacen_sony_migracion` (`ALL PRIVILEGES` los incluye; en producción los tiene, comprobado el 2026-11-16).
7. **Aviso a los usuarios** de la ventana, y **snapshot manual de Linode** (Cloud Manager, Backups, Take Snapshot) justo antes de empezar.

En adelante, en el servidor. **El paso 1 usa compose v2 (`docker compose`)**: `docker-compose` v1 falla al recrear
contenedores con Docker 29 (`KeyError: 'ContainerConfig'`, visto en el ensayo); v1 solo se usa para detener y borrar el
stack anterior y, en el rollback, para crearlo de nuevo desde cero.

```bash
cd ~/teleset-almacen
P1="docker compose -p teleset-almacen -f compose.paso1.yml --env-file $HOME/chronos-sony/.env"
DBPW="$(grep -E '^DB_PASSWORD=' ~/chronos-sony/.env | cut -d= -f2-)"    # contraseña de almacen_usr
```

## Paso 1. Versión nueva detrás de nginx

1. **Cierra el servicio** (la base sigue arriba para el dump). Los usuarios ven 502.

   ```bash
   docker-compose stop frontend backend
   ```

2. **Dump completo** y comprobación. Mismo usuario y opciones que el dump con el que se restauran las VM de staging (probado al restaurar):

   ```bash
   docker exec -e MYSQL_PWD="$DBPW" teleset-almacen_mariadb_1 mysqldump -ualmacen_usr --single-transaction --quick --routines --triggers --events --hex-blob \
     --max-allowed-packet=512M almacen_sony_migracion | gzip > ~/respaldo-pre-migracion-$(date +%Y%m%d-%H%M).sql.gz
   ls -lh ~/respaldo-pre-migracion-*.sql.gz        # 26-31 GB
   gzip -t ~/respaldo-pre-migracion-*.sql.gz && zcat ~/respaldo-pre-migracion-*.sql.gz | tail -n 1   # "-- Dump completed on …"
   ```

3. **MariaDB con el compose del paso 1** (misma imagen y datos; el puerto pasa a `127.0.0.1:3308`):

   ```bash
   docker-compose down                  # v1, compose original: borra los contenedores viejos (los datos son carpetas, no se tocan)
   pgrep -a mysqld                      # nada
   $P1 up -d --wait mariadb && $P1 ps   # "healthy"
   ```

4. **Migraciones** (`Baseline`, `MovimientoRelacion`, `Notificacion`, `PasswordTemporal`, `Configuracion`):

   ```bash
   $P1 run --rm -T api node build/migrar.js show     # 5 líneas "[ ]", código 1
   time $P1 run --rm -T api node build/migrar.js run
   $P1 run --rm -T api node build/migrar.js show     # todas "[X]", código 0
   ```

   Ejecuta las **consultas de control** de `docs/api/procedimiento-migracion-produccion.md`. Si algo no cuadra: rollback.
5. **API y front nuevos:**

   ```bash
   $P1 up -d
   curl -s http://127.0.0.1:34400/auth/version        # 2.89.0
   $P1 logs --tail 80 api                             # sin "migraciones pendientes" ni "DB_SYNCRO=true"
   curl -sI https://www.telesetalmacen.com/ | head -n 1
   ```

6. **Marca de Sony.** El administrador entra (su contraseña no cambia) y ve "Chronos WMS" hasta importar. (laptop):

   ```bash
   scp linode-prod:teleset-almacen/exogrid/auxiliares/sony-tv-logo.jpg /tmp/
   jq --arg logo "$(base64 -w0 /tmp/sony-tv-logo.jpg)" '.imagenes.reportes = $logo' \
     infra/clientes/sony/configuracion.json > /tmp/sony.import.json
   ```

   En la app: **Configuración → Importar** con `/tmp/sony.import.json`.
7. **Verificación del paso 1** (no sigas al paso 2 hasta completarla):
   - El acceso dice "Bienvenido a Sony Almacén México"; la versión mostrada es 4.10.0.
   - Catálogo e inventario cargan; las fotos y miniaturas se ven.
   - Subir una foto a un producto y un archivo a una operación; generar un reporte por grupo (lleva el logo de Sony) y descargarlo.
   - Registrar un préstamo y su devolución de prueba: aparecen en `movimiento_relacion` y `GET /activity/<id>/chain` da el saldo.
   - **Configuración → Correo → Enviar correo de prueba** llega; en el log, `Correo: transporte entorno`.
   - Crear un usuario de prueba: llega el correo con contraseña temporal y obliga a cambiarla. Desactívalo después.

**Rollback del paso 1** (la versión anterior no entiende el esquema nuevo y trae `DB_SYNCRO=true`: se restaura el dump).
La base se **borra y se crea de nuevo** antes de restaurar: el dump solo reemplaza sus propias tablas, y restaurarlo encima
dejaría las tablas nuevas (`migrations`, `movimiento_relacion`, `configuracion`, `notificacion`) y la vista.

```bash
$P1 stop api frontend
export MYSQL_PWD="$DBPW"      # la contraseña lleva caracteres especiales: se pasa por entorno, no dentro de una variable de comando
M() { docker exec -i -e MYSQL_PWD teleset-almacen-mariadb-1 mysql -ualmacen_usr "$@"; }
M -e "DROP DATABASE almacen_sony_migracion; CREATE DATABASE almacen_sony_migracion DEFAULT CHARACTER SET latin1 COLLATE latin1_spanish_ci"   # el juego anotado en el paso 0.6
gunzip -c ~/respaldo-pre-migracion-<fecha>.sql.gz | M almacen_sony_migracion
M -N almacen_sony_migracion -e "SELECT COUNT(*) FROM movimiento; SHOW TABLES LIKE 'migrations'"   # movimientos de antes; sin tabla migrations
$P1 down && docker-compose up -d        # v1, compose original: 2.63.67 + front-www (contenedores nuevos)
```

Cuenta con **unos 35 minutos** de restauración (tabla del ensayo). Con acceso `root` se acortaría a ~18 min con
`SET GLOBAL innodb_flush_log_at_trx_commit = 2` antes de restaurar (y `= 1` después); `almacen_usr` no puede cambiarlo. Alternativa si el dump no sirviera: restaurar el snapshot manual de Linode (se pierde todo lo posterior al snapshot).

## Paso 2. Caddy sustituye a nginx

1. **Apaga el stack del paso 1 y nginx** (corte de unos minutos):

   ```bash
   $P1 down
   docker ps                                         # ningún contenedor teleset-almacen; ningún mariadbd: pgrep -a mariadbd
   sudo systemctl disable --now nginx certbot.timer
   sudo ss -ltnp | grep -E ':(80|443) '              # nada
   ```

2. **Despliega** (laptop). Ya no hay migraciones pendientes, así que no hace falta `--permitir-migrar`:

   ```bash
   infra/clientes/desplegar.sh --host linode-prod --dir /home/cesargv/chronos-sony --cliente sony \
     --version-web 4.10.0 --version-api 2.89.0
   ```

   El primer arranque tarda un par de minutos mientras Caddy obtiene el certificado. Termina con `OK https://www.telesetalmacen.com/` y `/api/`.
3. **Verificación del paso 2:**
   - `curl -sI https://www.telesetalmacen.com/ | head -n 1` da `HTTP/2 200` sin `-k`; `curl -sI http://www.telesetalmacen.com/` redirige a https.
   - `curl -s https://www.telesetalmacen.com/entorno.json` da `{"cliente":"sony","entorno":"produccion"}`.
   - Repite la lista del paso 1.7 (acceso, fotos, subir archivo grande, reporte, correo de prueba).
   - Recarga una ruta interna (`/catalogo/general`): no da 404. Las notificaciones en vivo llegan.
   - `cd ~/chronos-sony && docker compose ps` (web, api, mariadb sanos) y `tail -n 1 despliegues.log` (`resultado=ok`).
   - `ss -ltn | grep 3308`: solo `127.0.0.1`.

**Rollback del paso 2** (los datos no cambian):

```bash
cd ~/chronos-sony && docker compose down
sudo systemctl enable --now nginx certbot.timer
cd ~/teleset-almacen && $P1 up -d
```

## Paso 3. MariaDB 10.3 → 10.11

En producción no hay contraseña `root` (ver "Estado de partida"), y no hace falta: desde 10.4 el plugin `unix_socket` viene
integrado, así que con 10.11 `root` entra **por socket desde dentro del contenedor, sin contraseña**. Ensayado el 2026-11-17
en `chronos-ensayo` con `root` configurado como en producción. Con 10.3 no se puede fijar `innodb_fast_shutdown=0` (requiere
`root`); el apagado normal de `docker compose stop` es limpio ("Shutdown complete" en el log) y bastó en el ensayo.

Solo con los pasos 1 y 2 verificados. El directorio de datos actualizado **no** lo puede abrir 10.3: la vuelta atrás es la copia en frío.

1. Espacio: la copia ocupa lo mismo que el directorio de datos (`sudo du -sh ~/teleset-almacen/db_data/mysql`; **32 GB** en el
   ensayo). Con el dump (~31 GB) en el servidor **no caben los dos** en los 66 GB libres: copia antes el dump fuera
   (laptop: `rsync -P linode-prod:respaldo-pre-migracion-*.sql.gz <destino>`), comprueba tamaño y `gzip -t` de la copia, y
   bórralo del servidor. Confirma con `df -h /` que quedan más de 40 GB libres.
2. Apagado limpio y copia en frío:

   ```bash
   cd ~/chronos-sony && docker compose stop web api
   docker compose stop mariadb
   docker logs --tail 3 chronos-sony-mariadb-1       # "InnoDB: Shutdown completed" y "mysqld: Shutdown complete"
   sudo cp -a ~/teleset-almacen/db_data/mysql ~/teleset-almacen/db_data/mysql-10.3
   ```

3. Cambia `MARIADB_IMAGEN=mariadb:10.11` en `~/chronos-sony/.env` y actualiza:

   ```bash
   docker compose up -d --wait mariadb
   docker compose exec mariadb mariadb -uroot -N -e "SELECT CURRENT_USER(), VERSION()"   # root@localhost, 10.11.x (sin contraseña)
   docker compose exec mariadb mariadb-upgrade -uroot
   docker compose restart mariadb && docker compose up -d --wait
   docker compose logs --since 30s mariadb | grep -F '[ERROR]'   # nada
   ```

   En el **primer** arranque con 10.11, antes de `mariadb-upgrade`, el log trae `[ERROR] Incorrect definition of table
   mysql.event` y "Disabling the Event Scheduler": es lo esperado y desaparece tras `mariadb-upgrade` y el reinicio. Desde
   10.11 el log repite cada 10 s `[Warning] Access denied for user 'root'@'127.0.0.1' (using password: NO)`: es el
   healthcheck (`mysqladmin ping` sin credenciales), no un intento de acceso.
4. Verifica: `migrar.js show` sin pendientes (`docker compose run --rm -T api node build/migrar.js show`), las consultas de
   control, y la lista del paso 1.7. Compara tiempos de un reporte grande con los de antes.

**Rollback del paso 3:** `docker compose down`; `sudo mv db_data/mysql db_data/mysql-10.11-fallido && sudo mv db_data/mysql-10.3 db_data/mysql`
(en `~/teleset-almacen`); vuelve a `MARIADB_IMAGEN=mariadb:10.3` y `docker compose up -d`. Se pierde lo capturado después de la copia.

## Después (cuando lleve unos días estable)

- Borra `db_data/mysql-10.3`, el dump del servidor (conserva la copia externa), `front-www/`, `front-nuevo/`, los contenedores
  detenidos y las imágenes `almacen-backend:*`.
- Retira `/etc/nginx/sites-enabled/*` y los registros DNS de los sitios retirados.
- Operación posterior (versiones nuevas, rollback de versión): igual que AMZ, `docs/infra/procedimiento-alta-amz.md` §9-10,
  con `--cliente sony`. Sony se detiene ante migraciones pendientes salvo `--permitir-migrar`.
- Quita `ARCHIVOS_PUBLICOS=true` cuando el front envíe el token en las imágenes.

## Ensayo (VM `chronos-ensayo`)

VM libvirt aparte de `chronos-staging`, creada desde el worktree con `infra/staging/staging.conf`
(`VM_NAME="chronos-ensayo"`, `CACHE_DIR="$HOME/ensayo-cache"`, que enlaza el dump y los archivos de `~/staging-cache`).
`01-create-vm.sh` + `03-provision-staging.sh` la dejan como producción: 2.63.67, esquema sin migrar, nginx del host por HTTP.
El correo queda atrapado (mailpit + bloqueo iptables): **nunca los quites**, los datos son reales.

Ensayo del 2026-11-14/15: los tres pasos y sus tres vueltas atrás terminaron bien (tras el rollback del paso 1: 54 tablas, ninguna de las nuevas, 715 647 movimientos y 2.63.67 con el front anterior respondiendo). Snapshots de la VM: `baseline-prod-20261114`,
`paso1-ok-20261114`, `paso2-ok-20261115`, `paso3-ok-20261115`.

El paso 2 se ensayó con web 4.9.0-s (`acme_dns` global). El 2026-11-16 se repitió el despliegue con web 4.10.0-s (reto DNS-01
por sitio): con Linode el reto **falló** con `20s`/`-1` (Let's Encrypt consultó antes de que el TXT estuviera en todos los
servidores de nombres) y con los valores por defecto `0s`/`2m` (la comprobación agotó el tiempo; en esa red además el router
intercepta el DNS), y **funcionó** con `5m`/`-1`. Por eso el `.env` de Sony fija esos dos valores; el corte del paso 2 dura
unos 5 min más que en la tabla. Los intentos fallidos pueden dejar registros TXT `_acme-challenge` huérfanos en la zona.

Diferencias del ensayo: se añade `-f compose.staging.yml` (mailpit) a los comandos del paso 1 y `--staging` a
`desplegar.sh`; `ENTORNO=staging`; etiquetas `-s`; dominio `ensayo.telesetalmacen.com` (`SONY_CADDY_DOMINIO` en `staging.conf`).

| Medición | Ensayo | Producción |
|---|---|---|
| Dump (API detenido, sin `--hex-blob`) | 13 min 7 s, 26 GB | |
| Migraciones (`migrar.js run`, 715 647 movimientos) | 12 s | |
| Rollback del paso 1 completo con `innodb_flush_log_at_trx_commit=1` (como se ensayó; reloj de la laptop) | 35 min | |
| Restauración del mismo volumen con `innodb_flush_log_at_trx_commit=2` (aprovisionamiento de la VM) | 18 min | |
| Corte del paso 2 (nginx abajo → Caddy con certificado de Let's Encrypt) | 131 s (incluye 12 s de snapshot de la VM) | |
| Emisión del certificado con web 4.10.0 y `DNS_PROPAGACION_ESPERA=5m`, `DNS_PROPAGACION_LIMITE=-1` (CA de pruebas, 2026-11-16) | 313 s | |
| Rollback del paso 2 (Caddy abajo → nginx + paso 1) | 37 s | |
| Volver a Caddy tras el rollback (certificado ya en `caddy_data`) | 18 s | |
| Paso 3: apagado limpio | 12 s | |
| Paso 3: copia en frío (32 GB) | 142 s | |
| Paso 3: primer arranque con 10.11 + `mariadb-upgrade` | 41 s + 6 s | |
| Rollback del paso 3 (volver al directorio 10.3) | 17 s | |
| Rollback del paso 1 con `almacen_usr`, sin `root` (2026-11-17) | 35 min 39 s | |
| Paso 3 sin contraseña `root` (2026-11-17): apagado normal / copia en frío / arranque 10.11 / `mariadb-upgrade` | 2 s / 218 s / 18 s / 5 s | |
