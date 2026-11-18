# Procedimiento: alta de AMZ en producción

Levanta el servidor de AMZ (Caddy + API + MariaDB en Docker) en un Linode nuevo, con la **misma imagen** que se probó
en staging. Está escrito para seguirse sin contexto previo. Diseño: `docs/superpowers/specs/2026-11-10-caddy-docker-amz-design.md`.

Convenciones: `<…>` es un valor que decides tú; **nunca** lo escribas en el repositorio. Los comandos marcados
"(máquina de build)" se ejecutan en la máquina del propietario, dentro de una copia del repo con `docker login` hecho;
los demás, en el servidor.

## Antes de empezar

- Las imágenes `exogrid/chronos-api:2.89.0-s` y `exogrid/chronos-web:4.10.0-s` están publicadas en Docker Hub
  (repositorios privados) y la aceptación en staging (modo `caddy-amz`) terminó bien. Si hay versiones más nuevas,
  sustituye `2.89.0` y `4.10.0` en todo el documento.
- Tienes `infra/imagenes/imagenes.conf` en la máquina de build (`cp infra/imagenes/imagenes.conf.example infra/imagenes/imagenes.conf`
  y `DOCKERHUB_NS=exogrid`).
- Tienes a mano: un token de Docker Hub **de solo lectura**, un token de Cloudflare con permiso `Zone · DNS · Edit` sobre
  la zona, las credenciales SMTP de Postmark y el nombre y correo de la persona administradora.

## 1. Crear el Linode

1. Cloud Manager, Create Linode: Ubuntu 24.04 LTS o posterior (el alta se hizo en 26.04), región a tu elección, plan de
   **2 GB de RAM como mínimo**, etiqueta `chronos-amz`. Con 2 GB el stack recién desplegado deja unos 1,3 GB disponibles;
   con 1 GB (Nanode) el margen es escaso, sobre todo durante el despliegue, que arranca un segundo proceso Node para las
   migraciones y la siembra (no se llegó a probar). Añade además 2 GB de swap:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
```

2. Activa **Backups** (snapshots diarios, a las 3 am, máximo 3). Es la política de respaldo de AMZ. El volcado
   periódico de la base a un bucket es una mejora planeada para después del arranque; no existe todavía.
3. Cloud Firewall: crea uno que permita entrada **solo** TCP 22, 80 y 443 (y UDP 443 si quieres HTTP/3) y asígnalo al Linode.
   Es obligatorio: Docker publica puertos saltándose `ufw`.
4. Anota la IP pública (`<IP-AMZ>`) y copia tu llave SSH al usuario `cesargv` (créalo con sudo si no existe).
   Configura en `~/.ssh/config` un alias, por ejemplo `amz-prod`, que apunte a `<IP-AMZ>` con ese usuario; el alias es
   el `--host` de los comandos siguientes.

## 2. Instalar Docker

```bash
ssh amz-prod
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 rsync
sudo usermod -aG docker cesargv
exit
```

Vuelve a conectarte (`ssh amz-prod`) para que el grupo `docker` surta efecto y entonces:

```bash
docker compose version               # debe ser v2
docker login -u exogrid              # pega el token de solo lectura como contraseña
```

Crea la carpeta de datos a nombre del usuario del despliegue (uid 1000). Así `desplegar.sh` crea dentro `db_data/` y
`exogrid/` sin `sudo`; solo recurre a `sudo -n` (sin contraseña) si la carpeta no existe o no es suya:

```bash
sudo mkdir -p /srv/chronos-amz && sudo chown cesargv:cesargv /srv/chronos-amz
```

## 3. DNS en Cloudflare

En la zona del propietario crea un registro **A** para el subdominio de AMZ (`<subdominio-amz>`) apuntando a `<IP-AMZ>`,
con la **nube gris** (solo DNS, sin proxy de Cloudflare). Así el tráfico llega directo al servidor y Caddy ve la IP real de
cada cliente (con la nube naranja vería las IP de Cloudflare). El certificado se obtiene por reto DNS contra la API de Cloudflare
(con `DNS_TOKEN`), así que no depende de que el servidor sea alcanzable para emitirlo. El mismo nombre se escribe luego en
`DOMINIOS` del `.env`. Antes de seguir, comprueba que el registro ya resuelve a la IP del servidor:

```bash
dig +short <subdominio-amz> @1.1.1.1 # debe imprimir <IP-AMZ>
```

Pregunta a un resolvedor público (`@1.1.1.1`) o hazlo desde el servidor: si consultaste el nombre antes de crear el
registro, tu red guarda la respuesta negativa hasta 30 minutos y la máquina de build seguirá sin resolverlo. Eso no
impide desplegar (la prueba de humo corre en el servidor); para probar desde la máquina de build mientras tanto usa
`curl --resolve <subdominio-amz>:443:<IP-AMZ> https://<subdominio-amz>/`.

## 4. Crear el `.env`

En la máquina de build:

```bash
scp infra/clientes/amz/.env.example amz-prod:~/chronos-amz.env.tmp
ssh amz-prod 'mkdir -p ~/chronos-amz && mv ~/chronos-amz.env.tmp ~/chronos-amz/.env && chmod 600 ~/chronos-amz/.env'
ssh amz-prod 'nano ~/chronos-amz/.env'
```

Valores a fijar (el resto del archivo ya trae un valor correcto; las líneas con `#` y sin valor hay que descomentarlas). Escribe los valores **sin comillas** (`DATOS_DIR=/srv/chronos-amz`, no `DATOS_DIR="/srv/chronos-amz"`): compose las pasaría tal cual a los contenedores.

| Variable | Valor |
|---|---|
| `ENTORNO` | `produccion` (también es el `environment` de Sentry; `SENTRY_ENVIRONMENT` se deja comentada) |
| `DATOS_DIR` | `/srv/chronos-amz` (aquí vivirán `db_data/` y `exogrid/`) |
| `DOMINIOS` | `<subdominio-amz>` (el nombre completo del paso 3) |
| `DNS_PROVEEDOR` / `DNS_TOKEN` | `cloudflare` / el token del paso 3 (real: 40 caracteres, o 53 con prefijo `cfut_` en los tokens nuevos; Caddy acepta ambos) |
| `ACME_EMAIL` | correo de contacto para Let's Encrypt |
| `ACME_CA` | **déjala comentada** (Let's Encrypt producción) |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | `openssl rand -hex 16` cada una |
| `JWTSECRET`, `CONFIG_CLAVE` | `openssl rand -base64 32` cada una; **distintos de los de staging** |
| `SMTP_USER`, `SMTP_PASS` | credenciales de Postmark |
| `SMTP_FROM` | `chronos-amz@exogrid.xyz` |
| `SOPORTE_CORREO` | `soporte@exogrid.io` |
| `SENTRY_DSN` | DSN del proyecto de la API (opcional; vacío = Sentry apagado) |

Guarda `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWTSECRET` y `CONFIG_CLAVE` en el gestor de contraseñas del propietario: perder
`JWTSECRET` cierra todas las sesiones; perder `CONFIG_CLAVE` deja ilegibles los secretos guardados en `/configuracion`.
`desplegar.sh` se niega a continuar si falta alguna de las claves obligatorias.

## 5. Promover las imágenes (máquina de build)

```bash
infra/imagenes/promover.sh web 4.10.0
infra/imagenes/promover.sh api 2.89.0
```

Cada uno añade la etiqueta `X.Y.Z` al **mismo digest** que `X.Y.Z-s` (sin reconstruir) e imprime el digest. Comprueba que
el digest de `4.10.0` es el de `4.10.0-s`, y lo mismo con la API; el script ya aborta si no coinciden. Falla si `-s` no
existe o si la etiqueta de producción ya está publicada (en ese caso sube la versión; no se sobrescribe). Anota los
dos digests en el PR (criterio 9 del diseño: producción usa el mismo digest que staging).

Si la etiqueta de producción ya existe porque se promovió antes (pasó en el alta: `chronos-api:2.89.0` y
`chronos-web:4.10.0` ya estaban publicadas), sáltate este paso y úsala tal cual. Compruébalo con
`docker buildx imagetools inspect exogrid/chronos-web:4.10.0`.

## 6. Desplegar

Antes, confirma que `dig +short <subdominio-amz>` imprime `<IP-AMZ>` (paso 3). Desde la raíz del repo, en la máquina de build:

```bash
infra/clientes/desplegar.sh --host amz-prod --dir /home/cesargv/chronos-amz --cliente amz \
  --version-web 4.10.0 --version-api 2.89.0 \
  --sembrar-admin <correo-del-administrador> --admin-nombre "<Nombre Apellido>"
```

(`--dir` debe ser ruta absoluta.) Antes puedes ensayarlo sin tocar el servidor añadiendo `--simular`. El script:
copia `compose.yml`, fija las versiones en el `.env` remoto, hace `pull`, levanta MariaDB, aplica las migraciones
(en AMZ las aplica sin preguntar; en una base nueva son todas), siembra el catálogo y el administrador, levanta el stack
y prueba `https://<subdominio-amz>/` y `/api/`. Al final añade una línea a `~/chronos-amz/despliegues.log`.

**La contraseña temporal del administrador se imprime en la consola durante la siembra** (y se envía por correo si el
SMTP funciona). Cópiala en ese momento: dura 72 horas y exige cambio al primer inicio de sesión. `sembrar.js` es idempotente y
se niega a correr si la base ya tiene movimientos (el script se detiene con "la base ya está en uso"); no repitas
`--sembrar-admin` en despliegues posteriores.

**En el primer despliegue la prueba de humo puede fallar** (`Error: https://<subdominio-amz>/ no responde`): Caddy
tarda en obtener el certificado (unos 5 minutos en el alta) y el script no espera tanto. No es un fallo del despliegue:
la base ya quedó migrada y sembrada. Espera a que el registro de Caddy diga `certificate obtained successfully`
(`docker compose logs web | grep -i "certificate obtained"`) y repite el comando **sin** `--sembrar-admin` ni
`--admin-nombre`; la segunda pasada no cambia nada, pasa la prueba de humo y deja `resultado=ok` en `despliegues.log`.

## 7. Verificación

1. Certificado: `curl -sI https://<subdominio-amz>/ | head -n 1` responde `HTTP/2 200` **sin** `-k`; en el navegador el
   candado es válido (Let's Encrypt).
2. Entra con `<correo-del-administrador>` y la contraseña temporal; la app obliga a cambiarla. Cámbiala.
3. Correo real: crea un usuario de prueba con un correo tuyo y comprueba que llega el correo de alta (remitente
   `chronos-amz@exogrid.xyz`). Elimina o desactiva ese usuario después.
4. Estado del stack, en el servidor:

```bash
cd ~/chronos-amz
docker compose ps                      # web, api y mariadb en "running"/"healthy"
docker compose logs --tail 50 web api
tail -n 3 despliegues.log              # última línea: resultado=ok
```

5. Con DSN configurado, provoca un error de prueba y confirma en Sentry `environment=produccion`, `cliente=amz` y el `release` esperado.

## 8. Marca

Entra a **/configuracion** con el administrador (rol `ADMINISTRADOR` o `CONFIGURACION-EDITAR`) y captura el nombre, el título, la
bienvenida y el logo de AMZ. La marca no se siembra a propósito (plan 03). Bodegas, áreas, proyectos y proveedores los captura el cliente.

## 9. Operación posterior

- **Versión nueva:** construye y publica `-s` (`infra/imagenes/construir.sh api|web`), pruébala en staging, promuévela (paso 5) y
  repite el comando del paso 6 **sin** `--sembrar-admin`, con las versiones nuevas.
- **Antes de una versión con migraciones:** toma un **snapshot manual** en Cloud Manager (Linode, Backups, Take Snapshot) y
  espera a que termine. Los respaldos diarios llegan a lo sumo 24 h atrás; el snapshot manual deja un punto exacto.
  `desplegar.sh` aplica en AMZ las migraciones pendientes sin pedir confirmación, así que el snapshot es responsabilidad de quien despliega.
- **Cambio de dominio:** `docs/infra/cambio-de-dominio.md`.

## 10. Rollback

- **Sin migraciones nuevas:** repite el comando del paso 6, sin `--sembrar-admin`, con las versiones anteriores
  (`--version-web <anterior> --version-api <anterior>`); fija la etiqueta en el `.env` y vuelve a levantar. Equivale a editar
  `IMAGEN_WEB` e `IMAGEN_API` en `~/chronos-amz/.env` y ejecutar `docker compose up -d` en esa carpeta.
- **Con migraciones nuevas:** si la versión anterior no es compatible con el esquema nuevo, revierte la migración **antes** de bajar
  la versión (la imagen vieja ya no trae el código de la migración nueva), con la versión nueva todavía desplegada:

```bash
cd ~/chronos-amz
docker compose run --rm -T api node build/migrar.js show      # qué hay aplicado
docker compose run --rm -T api node build/migrar.js revert    # revierte solo la última; repite si son varias
```

  y después repite el comando del paso 6 con las versiones anteriores. Alternativa: restaura el snapshot manual de Linode
  (Cloud Manager, Backups, Restore; pierdes lo capturado después del snapshot). Para decidir cuál, sigue el criterio de
  `docs/api/procedimiento-migracion-produccion.md`.
