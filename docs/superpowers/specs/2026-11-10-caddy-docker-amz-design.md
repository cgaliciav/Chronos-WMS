# Diseño · Caddy dentro de Docker y despliegue del cliente AMZ

Fecha: 2026-11-10 · Rama: `infra-caddy-staging` · Estado: borrador para aprobación

## 1. Intención

Hoy cada despliegue (staging y producción de Sony) tiene **dos nginx**: uno en el host que termina TLS (certificados con
certbot, sin verificar en `linode-prod`) y hace de proxy (`/api/` → contenedor `backend` en `:34400` quitando el prefijo;
`/` → `:34401`), y otro dentro de Docker (`nginx:1.25-alpine` + `front/nginx.conf`) que sirve el build estático del front.
Ver `infra/staging/nginx-staging.conf` y `infra/staging/docker-compose.staging.yml`.

El propietario quiere que **todo viva en Docker** y que el único proxy sea **Caddy**, con certificados automáticos por
**reto DNS**. El motivo inmediato es desplegar un **cliente nuevo, AMZ**, en un Linode nuevo y limpio. Unos días después,
de madrugada y con aviso, se migrará **Sony** al mismo esquema para homogeneizar los ambientes. Este diseño cubre AMZ y
deja staging listo para ensayar la migración de Sony; **no** cubre la migración de producción de Sony.

## 2. Objetivos

1. **Imagen web única con Caddy** (`chronos-web`): Caddy compilado con los plugins DNS de Cloudflare y Linode, con el
   build del front dentro. Sirve el estático, hace el proxy a la API y gestiona los certificados. La misma imagen sirve
   para cualquier cliente y entorno: dominio, proveedor DNS y token entran por variables de entorno.
2. **Imágenes construidas en la máquina del propietario y publicadas en Docker Hub.** Los servidores nunca compilan:
   el `docker-compose.yml` de cada entorno referencia `chronos-web:<versión>` y `chronos-api:<versión>`. Las imágenes no
   llevan secretos (la imagen antigua de Sony sí los trae horneados; las nuevas no).
3. **Compose parametrizado por cliente** (carpeta por cliente bajo `infra/clientes/<cliente>/` o equivalente) con los
   servicios `web` (Caddy), `api`, `mariadb`. Solo `web` publica puertos (80/tcp, 443/tcp, 443/udp).
4. **Carga inicial para una base vacía**: AMZ arranca con el esquema de las migraciones, **exactamente los mismos
   roles y tipos de movimiento que Sony** (mismos ids; `docs/api/tipos-de-movimiento.md`) y un único usuario
   administrador. Todo lo demás lo capturan ellos.
5. **Staging con dos topologías alternables** en la misma VM local `chronos-staging`:
   - modo `sony-nginx`: lo actual, sin cambios (réplica exacta de producción de Sony);
   - modos `caddy-amz` y `caddy-sony`: el stack nuevo con certificados reales, para AMZ y para ensayar Sony con Caddy.
   Solo un modo encendido a la vez (ambos quieren 80/443); cambiar de modo no borra datos.
6. **Procedimiento escrito** para levantar AMZ en su Linode nuevo, y para cambiar su dominio cuando lo decidan.

## 3. No objetivos

- Migrar la producción de Sony a Caddy (va después, con su propio procedimiento y ventana de madrugada).
- Respaldos lógicos de la base a un bucket (acordado como mejora posterior al arranque de AMZ; propuesta: dump diario
  a Cloudflare R2 cifrado con retención de 30 días). En AMZ se usan los **snapshots diarios de Linode** (3 am, máximo 3).
- CI/CD, registro distinto de Docker Hub, alta disponibilidad, Traefik u otros proxies.
- Retirar `front/nginx.conf`, `nginx-staging.conf` ni los scripts actuales de Sony: siguen en uso hasta su migración.

## 4. Anti-objetivos (fracaso aunque "funcione")

- Que staging envíe correo real: en los modos Caddy también todo el correo va a mailpit (`SMTP_ANULAR`), y el unit
  `staging-block-smtp` y el alias `smtp.postmarkapp.com` siguen activos en ambos modos.
- Tocar `linode-prod` (producción de Sony solo se lee).
- Secretos dentro de imágenes o en repositorios públicos.
- Romper el modo `sony-nginx` de staging o los scripts actuales (`update-staging.sh`, `front/deploy-production.sh`).
- Quedarse bloqueado por los límites de Let's Encrypt al iterar: mientras se prueba se usa la CA de pruebas de
  Let's Encrypt (`acme_ca` staging) y el volumen de datos de Caddy persiste.
- Perder la IP real del cliente: el API la registra en sesiones y peticiones (`req.ip` con `trust proxy`, decisión 3c).

## 5. Restricciones y hechos del entorno

- **DNS / certificados** (decisión del propietario):
  - AMZ: aún sin dominio propio; durante ~2 semanas vive en un **subdominio del propietario en Cloudflare**, tanto
    staging como producción. Reto DNS con Cloudflare.
  - Sony: dominio `telesetalmacen.com`, controlado por el propietario, con DNS en Linode. Producción usa reto DNS con
    Linode. El modo `caddy-sony` de staging usa **`staging.telesetalmacen.com`** (registro A en la zona de Linode hacia
    la IP privada de la VM) y **también el reto DNS de Linode**, para ensayar en staging exactamente el camino de
    producción antes de la ventana de madrugada. Cloudflare queda para AMZ (staging y producción).
- **Staging** es la VM libvirt local con red NAT (IP en `~/staging-cache/vm-ip`, hoy 192.168.122.64). Solo la usa el
  propietario. Con reto DNS, Let's Encrypt no necesita alcanzar la VM: el subdominio de staging apunta (registro A, sin
  proxy naranja) a la IP privada de la VM y se obtienen certificados reales.
- **Producción AMZ**: Linode nuevo. Docker Hub como origen de imágenes: el propietario tiene **Docker Pro** (repositorios
  privados ilimitados) y ya hay sesión iniciada en su máquina de build. Los servidores necesitan `docker login` (token de
  acceso de solo lectura).
- **Correo de AMZ**: la misma cuenta de Postmark que Sony; `SMTP_FROM=chronos-amz@exogrid.xyz`,
  `SOPORTE_CORREO=soporte@exogrid.io`.
- **Sentry** (decisión 7a: preparado, activo solo con DSN):
  - API: `api/src/sentry.ts` ya lee `SENTRY_DSN` en tiempo de ejecución, pero usa `NODE_ENV` como `environment`, y la
    imagen fija `NODE_ENV=production`, así que staging y producción se reportarían igual. Además no distingue cliente.
    Hay que añadir variables como `SENTRY_ENVIRONMENT` (staging/produccion) y una etiqueta `cliente` (amz/sony).
  - Front: `@sentry/react`; el DSN entra en el build (`VITE_SENTRY_DSN`) y `@sentry/vite-plugin` sube sourcemaps si hay
    `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`. Como la imagen web es una sola para todos, entorno y cliente se
    resuelven en tiempo de ejecución (por ejemplo desde `/config` o el nombre de host), no en el build.
- **Build del front**: `VITE_API_URL=/api/` es relativo, así que un build sirve para todos los clientes.
  `VITE_NOTIFICACIONES` debe ir en `on` para el API nuevo. `VITE_SENTRY_DSN` es de build.
- **API**: Dockerfile multietapa en `api/Dockerfile` (Node 24, usuario `node`, volumen `/code/exogrid`). Variables en
  `api/.env.example` (`TRUST_PROXY`, `CONFIG_CLAVE`, `SMTP_*`, `SMTP_ANULAR`, `ARCHIVOS_PUBLICOS`, …). Migraciones con
  `node build/migrar.js show|run|revert`. El nombre de base por defecto en la imagen es `almacen_sony_migracion`; para
  AMZ se fija por variable.
- **Las migraciones no insertan datos** (comprobado: ningún `INSERT` en `api/src/migration/`). Una base nueva no tiene
  `movimiento_tipo`, `rol`, ni otros catálogos que el código da por hechos.
- docker-compose v1 1.29 (apt) en la VM de staging falla al recrear contenedores de imágenes BuildKit
  (`update-staging.sh` lo rodea). Las imágenes de Docker Hub se construirán con buildx.
- Versionado obligatorio `vX.Y.Z` con sufijos `-d`/`-s` (CLAUDE.md raíz). Idioma: español.

## 6. Comportamiento que debe conservar Caddy (paridad con nginx)

Del `nginx-staging.conf` (copia del de producción) y `front/nginx.conf`:

- `/api/*` → `api:4200` **quitando el prefijo** `/api`; cabeceras `X-Forwarded-For`/`X-Forwarded-Proto` correctas.
- Subidas de hasta 100 MB sin buffer de petición; timeouts de unos 60 s hacia la API (Caddy no los tiene por defecto).
- WebSocket hacia la API.
- `index.html` con `Cache-Control: no-cache`; `/assets/*` con `public, max-age=31536000, immutable` y 404 si no existe;
  cualquier otra ruta → `index.html` (rutas sin `#`, decisión 15).
- **PWA del front** (front v4.8.0, `vite-plugin-pwa` en modo `prompt`, `generateSW`; ver `front/vite.config.ts` y
  `docs/front/arquitectura.md`). El service worker revisa `sw.js` cada 5 min para avisar de versiones nuevas, así que:
  - `/sw.js` y `/manifest.webmanifest` con `Cache-Control: no-cache`, igual que `index.html`. Así una versión nueva se
    detecta en minutos y no tras la caché heurística del navegador.
  - `/manifest.webmanifest` con `Content-Type: application/manifest+json`, fijado explícitamente.
  - `/sw.js`, `/workbox-*.js` y `/manifest.webmanifest` **nunca** caen al fallback de `index.html`: si faltan,
    responden 404. Un `sw.js` respondido con HTML rompe el registro del service worker por tipo MIME.
  - `/workbox-*.js` lleva hash en el nombre: puede ir con caché larga, como `/assets/*`.
  - El fallback SPA sigue aplicando solo a navegaciones. El service worker ya excluye `/api/` de su `navigateFallback`.
  - Nada de redirecciones sobre `sw.js`: los navegadores no siguen redirecciones al actualizar un service worker.
- CORS: hoy nginx añade `Access-Control-Allow-Origin *` encima de `cors()` de Express. En Caddy **no** se repite; lo
  gestiona solo Express (mismo origen en la práctica).
- La cabecera `X-Environment: staging` se mantiene en staging.

## 7. Decisiones del propietario (tal cual)

- Caddy en vez de nginx, todo dentro de Docker.
- AMZ en un **Linode nuevo**; staging en la **misma VM local**; staging lo prueba solo él por ahora.
- Staging corre **las dos topologías, alternando** (no simultáneas).
- Imágenes construidas en su máquina, subidas a **Docker Hub** (cuenta Pro); el compose referencia esas imágenes.
- **Producción usa exactamente la imagen probada en staging** (en cuanto a código): se construye una vez y se promueve.
- AMZ envía con la misma cuenta de Postmark que Sony, remitente `chronos-amz@exogrid.xyz`, soporte `soporte@exogrid.io`.
- `caddy-sony` en staging usa `staging.telesetalmacen.com` con reto DNS de Linode.
- **Sentry también en la API**, no solo en el front.
- La base de AMZ arranca solo con un administrador (el correo del propietario), y **exactamente los mismos roles y
  tipos de movimiento que Sony**; la operación será casi idéntica.
- Retos DNS: Cloudflare (AMZ staging y prod), Linode (Sony staging y prod).
- Respaldos de AMZ: snapshots de Linode; el dump a bucket queda para después del arranque.

## 8. Llamadas del diseñador (revisables)

- **Front dentro de la imagen de Caddy** en vez de un contenedor de front aparte: hace falta un Caddy propio por los
  plugins DNS, y así un solo contenedor cubre estático + proxy + TLS. `chronos-web` contiene el binario de Caddy con
  los plugins `caddy-dns/cloudflare` y `caddy-dns/linode`, el Caddyfile y el build de React. Versión de
  `chronos-web` = versión del front.
- **Promoción de imágenes**: cada imagen se construye **una sola vez** con la versión `X.Y.Z` dentro (package.json,
  `release` de Sentry). Staging la usa con la etiqueta `X.Y.Z-s`; al aprobarla, se añade la etiqueta `X.Y.Z` al mismo
  digest (`docker buildx imagetools create` o `docker tag` + push), sin reconstruir. Los compose de producción fijan la
  versión y, si se quiere blindar, el digest. El sufijo `-s` vive en la etiqueta y en el changelog, no dentro del build.
- Caddyfile con variables de entorno (`{$DOMINIO}`, `{$DNS_PROVEEDOR}`, `{$DNS_TOKEN}`, `{$ACME_EMAIL}`, …) para no
  tener un Caddyfile por cliente. Admite varios dominios para el cambio de subdominio a dominio definitivo de AMZ.
- **Cambio de dominio de AMZ con PWA**: el service worker queda registrado por origen. Si el subdominio viejo
  redirigiera todo al dominio nuevo, los navegadores con el service worker viejo seguirían mostrando la app desde su
  precaché: sus llamadas a `/api` recibirían 301 (los POST se rompen) y la actualización de `sw.js` fallaría por la
  redirección. Por eso, durante la transición **ambos dominios sirven la app completa** en el mismo bloque de Caddy.
  Solo después de unas semanas se retira el viejo o se redirige, cuando los usuarios ya entren por el nuevo.
- **Sourcemaps (`*.map`) no se sirven públicamente** (404): el build los genera (`sourcemap: true`) y, si Sentry está
  configurado, `@sentry/vite-plugin` los sube allí. Hoy nginx sí los sirve; es reversible si hiciera falta.
- Registros DNS **sin proxy de Cloudflare** (nube gris): IP real del cliente directa y un salto menos que depurar.
- La carga inicial es un **script idempotente** del API (p. ej. `node build/sembrar.js`), **no** una migración: Sony
  ya tiene esos datos y una migración que inserta tendría que distinguir ambos casos. Los datos (roles, tipos de
  movimiento y lo que haga falta) se extraen **una vez** de la copia de producción en staging y se versionan en el repo.
  El correo del administrador es un parámetro (no se escribe en el repo). La contraseña es temporal, con cambio
  obligatorio al primer inicio de sesión (reutiliza el mecanismo de `PasswordTemporal`).
- La marca de AMZ (nombre, logo) **no** se siembra: el administrador la pone desde `/configuracion` (plan 03).
- Modos Caddy en staging con **docker compose v2** (paquete `docker-compose-v2`, convive con v1) para evitar el fallo
  de recreación de v1; AMZ producción también con compose v2.
- Firewall de Linode (Cloud Firewall) permitiendo solo 22, 80, 443 en el servidor de AMZ: los puertos publicados por
  Docker se saltan `ufw`.
- Un script de staging para alternar modos (`infra/staging/staging-modo.sh sony-nginx | caddy-amz | caddy-sony`) que
  apaga el stack activo (y el nginx del host en los modos Caddy) antes de encender el otro, y dice cuál está activo.
  **Un solo cliente encendido a la vez** también dentro de Caddy (VM de 4 GB; el propietario aceptó alternar).
- **Ensayo de Sony con Caddy (`caddy-sony`) sobre los mismos datos** que `sony-nginx` (`db_data/`, `exogrid/` de
  `~/teleset-almacen`; no hay disco para una copia de ~38 GB). Usa `chronos-api` de la **misma versión** que el
  `almacen-backend:staging-<sha>` desplegado en `sony-nginx` (staging ya corre código del repo con las migraciones
  aplicadas), así que alternar no cambia el esquema. El script toma un snapshot de la VM antes de entrar a
  `caddy-sony` por primera vez; si un ensayo migra, se vuelve con `virsh snapshot-revert`.
- **MariaDB 10.11** para AMZ (y en el stack Caddy en general): es la que ya usan `api/docker-compose.test.yml` y
  `docker-compose.dev.yml`, así que las migraciones y la carga inicial se prueban ahí. `caddy-sony` mantiene `10.3`
  porque usa los datos de Sony; actualizar Sony es un trabajo aparte.
- **Sentry**: dos proyectos en Sentry (API y front), cada uno con **un solo DSN para todos los clientes**. Cliente y
  entorno se distinguen con `environment` y la etiqueta `cliente`, fijados en tiempo de ejecución, para que cada imagen
  siga siendo una sola. El `release` coincide con la versión `X.Y.Z` de la imagen.
- La contraseña temporal del administrador **se muestra en consola** al correr la carga inicial (además del correo si
  el SMTP está configurado), para no depender del correo el primer día.

## 9. Lo que queda al constructor

- Inventario exacto de las tablas de catálogo que el código da por hechas en una base nueva (al menos `movimiento_tipo`
  y `rol`; revisar relaciones como `rol_comentarios_comentario`/`comentario`, estatus, permisos u otras) y comprobar que
  el API arranca y opera con `configuracion` vacía.
- Nombres de repositorios en Docker Hub, etiquetas (`vX.Y.Z`, `-s` para staging) y script de build+push.
- Valor correcto de `TRUST_PROXY` para Caddy en la red de Docker, verificado con la IP real en una sesión.
- Estructura de carpetas en la VM de staging y en el servidor de AMZ, y cómo encaja `update-staging.sh` con los modos
  Caddy (extenderlo o un script hermano).
- Healthchecks, `restart: unless-stopped`, límites de logs de Docker.
- Cómo se dispara el envío (o la entrega en consola) de la contraseña temporal del administrador.
- Documentación: procedimiento de alta de AMZ (crear Linode, Docker, firewall, `.env`, `docker login`, pull,
  migraciones, carga inicial, verificación, activar snapshots), procedimiento de cambio de dominio, actualización de
  `infra/staging/README.md`, `docs/decisiones.md` (decisión nueva: Caddy en Docker) y changelogs con su versión.

## 10. Criterios de aceptación

1. En staging, `staging-modo.sh caddy-amz` levanta AMZ con certificado válido de Let's Encrypt (CA de producción) en su
   subdominio, accesible desde la máquina del propietario; `staging-modo.sh sony-nginx` devuelve exactamente el
   estado actual y `update-staging.sh` sigue funcionando en ese modo.
2. En modo `caddy-amz`: login con el administrador sembrado (contraseña temporal → cambio), alta de un movimiento de cada
   tipo usado en la operación, subida de un archivo de ~100 MB, rutas profundas recargando la página, caché correcta
   de `index.html` y `/assets/*`, la IP real del cliente registrada en la sesión, y el correo llegando a mailpit.
3. Ninguna imagen publicada contiene secretos (`docker history`/inspección de variables).
4. La carga inicial es idempotente (correrla dos veces no duplica) y deja los mismos ids de `movimiento_tipo` y los
   mismos `codigoRol` que Sony.
5. El modo `caddy-sony` levanta Sony con Caddy sobre los datos de staging,
   como ensayo de su migración.
6. El procedimiento de producción de AMZ está escrito y es seguible por una persona sin contexto previo.
7. El modo `caddy-sony` obtiene certificado para `staging.telesetalmacen.com` con el reto DNS de **Linode**.
8. Con DSN configurado, un error forzado en la API y otro en el front llegan a Sentry con el `environment`, la etiqueta
   `cliente` y el `release` correctos (staging y producción distinguibles con la misma imagen).
9. La imagen desplegada en producción de AMZ tiene el mismo digest que la probada en staging.
10. PWA: con una pestaña abierta, desplegar una versión nueva de `chronos-web` hace aparecer el aviso "Hay una versión
    nueva" en ≤ 5 min; `curl -I` muestra `no-cache` en `/`, `/index.html`, `/sw.js` y `/manifest.webmanifest`, el
    `Content-Type` correcto del manifest, 404 (no HTML) para un `/sw-inexistente.js` y para `*.map`, y la app se puede
    instalar desde Chrome.
