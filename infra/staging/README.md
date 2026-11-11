# Staging local (réplica de producción)

Crea una VM local con KVM/libvirt que replica `linode-prod` (`/home/cesargv/teleset-almacen`):
mismo SO, mismo runtime, misma imagen del backend, misma DB y mismos archivos. Producción **solo se lee**.

## Qué se replica

| | Producción | Staging |
|---|---|---|
| SO / HW | Ubuntu 24.04, 4 vCPU, 8 GB | Ubuntu 24.04, **2 vCPU, 4 GB** (VM libvirt `chronos-staging`; suficiente para ~6-12 usuarios) |
| Runtime | docker.io + docker-compose v1 (apt) + nginx en el host | Igual |
| DB | `mariadb:10.3`, `almacen_sony_migracion` (~24.5 GB) | Igual, restaurada de `mysqldump --single-transaction` |
| Backend | imagen `almacen-backend:<tag>` que corre en prod | La **misma imagen** (`docker save`/`load`) |
| Frontend | `nginx:1.25-alpine` + `front-www/` | Igual |
| Archivos | `exogrid/` (~13 GB) | Copia con rsync |
| Proxy | nginx host con SSL por dominio | nginx host, HTTP por IP |

Diferencias intencionales:
- **Secretos propios** (`~/teleset-almacen/.env` en la VM, generados allí): `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `JWTSECRET`. Tienen prioridad sobre cualquier valor por defecto de la imagen.
- **Correo atrapado**: en staging el host SMTP del backend resuelve al contenedor **mailpit** (UI en `:8025`) y además iptables bloquea SMTP saliente (25/465/587/2525). Los datos son reales: nunca quites este bloqueo.
- **`SMTP_ANULAR=mailpit:2525`** (plan 03): la configuración restaurada de producción puede traer un SMTP real en la tabla `configuracion`; `SMTP_ANULAR` gana sobre ella y no envía credenciales. `update-staging.sh` se detiene si el log del backend dice `Correo: transporte bd|entorno`. `CONFIG_CLAVE` es propia de staging (se genera en la VM).
- MariaDB solo escucha en `127.0.0.1:3308` de la VM.

## Requisitos (laptop)
- `/dev/kvm`, `libvirt`, `virt-install`, `qemu-utils`; usuario en grupos `libvirt` y `kvm`.
- Acceso `ssh linode-prod`.
- ~80 GB libres en `/var/lib/libvirt/images` y ~40 GB en `~/staging-cache`.
- 4 GB de RAM libres para la VM (ajustable en `staging.conf`).

## Uso

```bash
cd infra/staging
cp staging.conf.example staging.conf   # opcional

./replicate-prod.sh                    # primera vez: VM + copia de prod + aprovisionamiento
```

Tiempos medidos (2026-11-08): VM ~2 min · dump ~28 min (31 GB gz) · rsync exogrid ~7 min · restore ~21 min (con 4 vCPU; con 2 vCPU puede tardar más).
El dump genera mucha lectura en prod; si es horario laboral el script pide confirmación. Todo es reanudable:
si algo falla, vuelve a ejecutar el mismo comando.

Al terminar imprime las URLs: `http://<IP_VM>/`, `/api/`, mailpit en `:8025`.
Crea un snapshot limpio para revertir rápido tras pruebas destructivas:

```bash
virsh -c qemu:///system snapshot-create-as chronos-staging baseline
virsh -c qemu:///system snapshot-revert chronos-staging baseline
```

### Actualizar staging (`update-staging.sh`)

Despliega el código de este repositorio en staging: API (imagen nueva + **migraciones**) y front. Es el ensayo del
despliegue a producción sobre una copia real de sus datos.

```bash
./update-staging.sh                  # API + front desde el árbol de trabajo (incluye cambios sin confirmar → <sha>-dirty)
./update-staging.sh --ref main       # un commit, rama o tag concreto (git archive; no toca tu árbol de trabajo)
./update-staging.sh --api-only       # solo el API   ·   --front-only: solo el front
./update-staging.sh --no-migrate     # se detiene si hay migraciones pendientes (la imagen actual sigue en uso)
./update-staging.sh --status         # imagen y versión en uso, migraciones, últimos despliegues, snapshots
./update-staging.sh --rollback       # vuelve a la versión de producción (imagen y front de ~/staging-cache)
```

Otras opciones: `--no-snapshot`, `--snapshot` (snapshot aunque no haya migraciones), `--skip-front-build`
(publica el último build de la caché), `-y` (sin confirmaciones).

**Versionado.** El script aplica las reglas del [`CLAUDE.md` raíz](../../CLAUDE.md): en staging la versión de cada app
termina en **`-s`**. Toma la base `X.Y.Z` del `package.json` del código desplegado (que puede traer `X.Y.Z` o
`X.Y.Z-d`) y construye con `X.Y.Z-s`, reescribiendo `package.json` y `package-lock.json` **solo en la copia** que se
construye (`~/staging-cache/src/{api,front}`); tu árbol de trabajo y el repo no cambian. Cualquier otro formato
(`4.0`, `v4.0.0`, `4.0.0-rc.1`…) detiene el despliegue. Así, `GET /api/` responde p. ej. `2.80.0-s`, el front muestra
`4.0.0-s` (y Sentry recibe `chronos-wms-front@4.0.0-s`), y `deploys.log`, `front.version` y `--status` las anotan
como `vX.Y.Z-s`. `--rollback` vuelve a la versión de producción, que no lleva sufijo.

Qué hace con el **API**:

1. Copia `api/` a la VM (`~/teleset-almacen/api-src`) y construye `almacen-backend:staging-<sha>` con el
   `Dockerfile` de `api/` (la imagen actual sigue sirviendo mientras tanto).
2. Ejecuta `node build/migrar.js show` con la imagen nueva. Si hay migraciones pendientes: pide confirmación,
   crea el snapshot `pre-update-<fecha>-<sha>` de la VM, **detiene el backend**, ejecuta `node build/migrar.js run`
   y comprueba que no quedan pendientes. Es el mismo orden que `docs/api/procedimiento-migracion-produccion.md`,
   con el snapshot en lugar del respaldo `mariadb-dump` (el dump de 24 GB tarda ~30 min; el snapshot, segundos).
3. Ajusta el dueño de `exogrid/` a 1000:1000 si hace falta (la imagen corre como `node`).
4. Cambia `BACKEND_IMAGE` en `~/teleset-almacen/.env` (guarda la anterior en `BACKEND_IMAGE_PREV`), levanta el
   backend, espera a `GET /`, comprueba que responde la versión `X.Y.Z-s` esperada y busca en el log avisos de
   «migraciones pendientes» o `DB_SYNCRO=true`.
5. Borra las imágenes `staging-*` viejas (conserva la actual, la anterior y la de producción).

Con el **front** construye en un contenedor local `node:<front/.nvmrc>` (Node 24): `npm ci && npm run build`
(`tsc -b && vite build`) con `VITE_API_URL=/api/`; las demás variables `VITE_*` toman su valor por defecto
(notificaciones apagadas, Sentry sin DSN) porque los `.env*` locales no se copian. No hace falta Node ni npm en el
equipo. Si la ref desplegada aún trae `yarn.lock` (front anterior al plan 01: CRA, Node 10) usa `yarn` en su lugar.
Usa `~/staging-cache/src/front` como copia de trabajo y `~/staging-cache/npm-cache` (o `yarn-cache`). Publica `build/` en
`front-www/` de la VM y anota qué se desplegó en `~/teleset-almacen/front.version`.

Al final ejecuta las mismas comprobaciones que el aprovisionamiento (front, API, mailpit, `smtp.postmarkapp.com` →
mailpit, regla iptables de SMTP). Cada despliegue queda en `~/teleset-almacen/deploys.log` de la VM (fecha,
componente, versión, ref, imagen, migraciones aplicadas, snapshot) y la salida completa en
`~/staging-cache/update-<fecha>.log`. Un candado (`~/staging-cache/.update.lock`) impide dos despliegues a la vez.
También copia `docker-compose.staging.yml` a la VM en cada corrida.

`deploy-api-staging.sh` y `deploy-front-staging.sh` siguen existiendo como atajos de `--api-only` y `--front-only`
(`SKIP_BUILD=1 ./deploy-front-staging.sh` equivale a `--skip-front-build`).

**Volver atrás**

| Situación | Cómo |
|---|---|
| Falló el build o `migrar.js show` | Nada que hacer: la imagen anterior sigue en uso. |
| Fallaron las migraciones | El script vuelve a levantar la imagen anterior e imprime el snapshot. La BD puede estar a medias: `virsh -c qemu:///system snapshot-revert chronos-staging pre-update-…` o `./03-provision-staging.sh --keep-image --force-restore`. |
| El API nuevo no arranca o falla en pruebas | `./update-staging.sh --rollback` (imagen de producción). Funciona aunque se haya migrado: el compose fija `DB_SYNCRO=false` y las columnas nuevas tienen valor por defecto, pero el esquema queda migrado. |
| Quiero el estado exacto previo | `virsh -c qemu:///system snapshot-revert chronos-staging pre-update-…` (VM completa: BD, imagen, front y `deploys.log`). |

Los snapshots `pre-update-*` ocupan disco en `/var/lib/libvirt/images`; el script avisa cuando hay más de 3.
Bórralos con `virsh -c qemu:///system snapshot-delete chronos-staging <nombre>`.

**Diferencias con producción** que introduce el compose de staging: `DB_SYNCRO=false` siempre (la imagen 2.63.x de
producción trae `true`; con el esquema intacto no cambia nada, y tras migrar evita que esa imagen ajuste el esquema
por su cuenta) y `ARCHIVOS_PUBLICOS=true` (paso 3 del procedimiento de migración: sin ella el front actual no ve las fotos).

### Refrescar datos desde producción

```bash
./replicate-prod.sh --refresh-data   # nuevo dump + rsync incremental + restore (imagen vuelve a la de prod)
./03-provision-staging.sh --keep-image --force-restore   # re-restaurar sin cambiar la imagen del backend
```

## Modos: Sony con nginx, AMZ con Caddy, Sony con Caddy

La VM puede estar en **un** modo a la vez, porque los tres comparten los puertos 80/443 y `caddy-sony` comparte además
el directorio de datos de MariaDB de Sony (`~/teleset-almacen/db_data/mysql`): dos servidores MariaDB sobre el mismo
directorio lo corrompen. El modo activo vive en `~/staging-modo` de la VM.

| Modo | Qué corre | Carpeta en la VM |
|---|---|---|
| `sony-nginx` (el de siempre) | docker-compose v1 + nginx del host, HTTP por IP | `~/teleset-almacen` |
| `caddy-amz` | Caddy + API + MariaDB de AMZ (`compose.yml` + `compose.staging.yml`), HTTPS por DNS-01 de Cloudflare | `~/chronos-amz` (`.env`, `db_data/`, `exogrid/`) |
| `caddy-sony` | Lo mismo para Sony, reutilizando sus datos; DNS-01 de Linode (`staging.telesetalmacen.com`) | `~/chronos-sony` (solo `.env` y compose; `DATOS_DIR=/home/cesargv/teleset-almacen`) |

```bash
./staging-modo.sh --preparar            # una vez (idempotente): compose v2, carpetas, .env con secretos, docker login
./staging-modo.sh --estado              # modo, contenedores, imágenes y vencimiento del certificado
./staging-modo.sh caddy-amz             # cambia de modo (también sony-nginx y caddy-sony)
./desplegar-caddy.sh amz --version-web 4.9.0-s --version-api 2.89.0-s \
    --sembrar-admin correo@ejemplo.com --admin-nombre "Nombre Apellido"
```

`--preparar` instala `docker-compose-v2` si falta (las VM nuevas ya lo traen por cloud-init; `docker-compose` v1 sigue
instalado para Sony con nginx), crea las carpetas, copia los compose y genera cada `.env` desde su `.env.example` con
secretos aleatorios (`openssl rand`) **sin sobrescribir uno existente**. El `.env` de Sony toma `DB_PASSWORD`,
`DB_ROOT_PASSWORD`, `JWTSECRET` y `CONFIG_CLAVE` del `.env` del stack v1 (mismos datos, mismas credenciales). Pide por
consola (sin mostrarlos) el token de Cloudflare (AMZ), el de Linode (Sony), el subdominio de AMZ, `ACME_EMAIL`, el
espacio de nombres de Docker Hub y un token de Docker Hub de solo lectura para `docker login -u exogrid` en la VM. Los
secretos viajan por la entrada estándar de ssh, nunca por la línea de comandos ni a los logs.

**Cambiar de modo** apaga siempre los tres stacks y nginx, comprueba con `docker ps`, procesos y `ss -ltn` que no queda
nada en marcha y que 80/443 están libres, toma el snapshot (solo la primera entrada a `caddy-sony`:
`pre-caddy-sony-<AAAAMMDD-HHMM>`), enciende el destino y guarda el modo. Durante el cambio `~/staging-modo` dice
`en-transicion`. Si un cliente Caddy aún no tiene un despliegue correcto, el cambio solo registra el modo: lo enciende
`desplegar-caddy.sh`.

**`desplegar-caddy.sh`** llama a `infra/clientes/desplegar.sh --staging` contra la VM y **se niega** si el modo activo
no es el del cliente o si `docker ps` muestra contenedores de otro stack o nginx activo. Con `--permitir-migrar` toma
antes el snapshot `pre-update-<AAAAMMDD-HHMM>-caddy-<cliente>` (como `update-staging.sh`). Sony se detiene si hay
migraciones pendientes salvo `--permitir-migrar`.

**Certificado de AMZ.** La primera vez el `.env` de AMZ lleva `ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory`
(CA de pruebas, sin límites de uso; el navegador no la confía). Cuando `docker compose logs web` muestre
`certificate obtained`, quita esa línea del `.env`, ejecuta `docker compose -f compose.yml -f compose.staging.yml up -d web`
en `~/chronos-amz` (borra antes el volumen `caddy_data` si el certificado de pruebas quedó guardado:
`docker compose -f compose.yml -f compose.staging.yml rm -sf web && docker volume rm chronos-amz_caddy_data`) y comprueba con `curl -v https://<subdominio>/`
un certificado válido sin `-k`.

**Volver a lo de antes**: `./staging-modo.sh sony-nginx`; `update-staging.sh` solo funciona en ese modo.
Sin tocar la VM: `--simular` imprime los pasos (`STAGING_MODO_SIMULADO=caddy-amz` finge el modo); `desplegar-caddy.sh --solo-comprobar`
ejecuta solo las comprobaciones de seguridad; `./probar-modos.sh` ejecuta los scripts remotos en local con stubs de `docker`,
`systemctl`, `ss`, `pgrep`, `virsh`… (`--preparar`, cada cambio de modo, rechazos) y debe terminar con 0 fallos.

## Scripts

| Script | Qué hace |
|---|---|
| `replicate-prod.sh` | Orquestador de las 3 fases (`--skip-vm`, `--refresh-data`, `--provision-only`, `-y`) |
| `01-create-vm.sh` | Descarga Ubuntu 24.04 cloud image, crea disco y VM con cloud-init (docker, compose, nginx) |
| `02-sync-from-prod.sh` | Dump de DB, rsync de `exogrid/` y `front-www/`, `docker save` de la imagen del backend → `~/staging-cache` |
| `03-provision-staging.sh` | Copia a la VM, genera secretos, restaura DB, configura nginx y bloqueo SMTP, levanta stack, smoke tests |
| `update-staging.sh` | Actualiza staging con el código del repo: API (build, migraciones con snapshot) y front |
| `deploy-api-staging.sh` / `deploy-front-staging.sh` | Atajos de `update-staging.sh --api-only` / `--front-only` |
| `staging-modo.sh` | Alterna la VM entre `sony-nginx`, `caddy-amz` y `caddy-sony`; `--estado`, `--preparar` |
| `desplegar-caddy.sh` | Despliega AMZ o Sony con Caddy en el modo correspondiente (envuelve `infra/clientes/desplegar.sh`) |
| `probar-modos.sh` | Pruebas locales (stubs) de `staging-modo.sh` y `desplegar-caddy.sh`, sin VM |
| `staging-db.sh` | Helper instalado en la VM (`~/teleset-almacen/bin/staging-db`) para SQL como root sin exponer passwords |

## Troubleshooting
- **IP de la VM**: `virsh -c qemu:///system domifaddr chronos-staging` (se guarda en `~/staging-cache/vm-ip`).
- **SSH**: `ssh -i ~/.ssh/id_ed25519 -o UserKnownHostsFile=~/staging-cache/known_hosts cesargv@<IP>`.
- **Logs del backend**: `ssh … 'docker logs -f teleset-almacen_backend_1'`.
- **`KeyError: 'ContainerConfig'` en `docker-compose up`**: bug de docker-compose 1.29 al recrear un contenedor cuya imagen se construyó con BuildKit (las `staging-*`). `update-staging.sh` ya lo evita; a mano: `docker-compose rm -sf backend && docker-compose up -d backend`.
- **Logs de cada corrida**: `~/staging-cache/replicate-*.log` y `~/staging-cache/update-*.log`.
- **«Otro update-staging.sh está en curso»**: espera a que termine; si no hay ninguno corriendo, el candado se libera solo (es `flock`).
- **Recrear desde cero**: `virsh -c qemu:///system destroy chronos-staging; virsh -c qemu:///system undefine chronos-staging --remove-all-storage`, borrar `~/staging-cache/vm-ip` y volver a correr `replicate-prod.sh` (la caché de datos se reutiliza).
