# chronos-web

Imagen única que sirve el front (build de Vite), hace de proxy hacia el API y obtiene el certificado TLS. Reemplaza al
nginx del host y al contenedor nginx del front. Contiene Caddy 2.10 compilado con los módulos DNS
`caddy-dns/cloudflare` y `caddy-dns/linode`, el `Caddyfile` y el build del front en `/srv`. Su versión es la del front.

Diseño y reglas de comportamiento: `docs/superpowers/specs/2026-11-10-caddy-docker-amz-design.md` (§6 y §8).

## Construcción

Desde la raíz del repo (el contexto necesita `front/`):

```bash
docker build -f infra/web/Dockerfile --build-arg VERSION=4.8.0 -t chronos-web:4.8.0-s .
```

| Argumento | Uso |
|---|---|
| `VERSION` | `X.Y.Z` sin sufijo. Se escribe en el `package.json` del front antes del build (release de Sentry `chronos-wms-front@X.Y.Z`). La etiqueta `-s` va en la imagen, no aquí |
| `VITE_SENTRY_DSN` | DSN de Sentry del front (opcional; vacío = apagado) |

Fijos en el build: `VITE_API_URL=/api/` y `VITE_NOTIFICACIONES=on`.

## Variables de ejecución

| Variable | Ejemplo | Uso |
|---|---|---|
| `DOMINIOS` | `amz.ejemplo.mx, otro.ejemplo.mx` | Direcciones del sitio, separadas por `, ` (coma **y espacio**), todas con el mismo proveedor DNS. `:80` = modo de prueba sin TLS |
| `DNS_PROVEEDOR` | `cloudflare` / `linode` | Proveedor del reto DNS-01 de `DOMINIOS` (por defecto `cloudflare`) |
| `DNS_TOKEN` | | Token del proveedor DNS. Cloudflare exige que tenga formato válido (40 caracteres) incluso con `:80` |
| `DNS_RESOLVERS` | `1.1.1.1 1.0.0.1` | Resolvedores con los que Caddy busca la zona y comprueba la propagación del TXT |
| `DNS_PROPAGACION_ESPERA` | `0s` / `20s` | Espera fija tras crear el TXT, antes de comprobar |
| `DNS_PROPAGACION_LIMITE` | `2m` / `-1` | Tiempo máximo de la comprobación de propagación. `-1` la desactiva: la CA valida desde fuera. Hace falta en una red que intercepta el DNS saliente (el staging local: `compose.staging.yml` fija `-1` y `20s`) |
| `DNS_TOKEN_2` | | Token de un segundo proveedor, para un sitio adicional (ver abajo) |
| `ACME_EMAIL` | | Cuenta ACME |
| `ACME_CA` | | CA de ACME; por defecto Let's Encrypt producción. Usa la de pruebas al iterar |
| `API_UPSTREAM` | `api:4200` | Destino de `/api` (se quita el prefijo) |
| `CLIENTE`, `ENTORNO` | `amz`, `staging` | Cuerpo de `/entorno.json` y cabecera `X-Environment` |

Las variables `DNS_*` nunca pueden ir vacías (rompen el Caddyfile); el compose les pone sus valores por defecto. Los
registros DNS van sin proxy de Cloudflare (nube gris) y no hace falta que el registro A exista en el proveedor del reto:
puede vivir en otro DNS (p. ej. el router de una red local). Persiste `/data` (certificados) como volumen.

## Reto DNS por sitio y sitios adicionales

El certificado se pide **por sitio** con el snippet `tls_dns <proveedor> <token>`, así que cada dominio puede usar su
propio proveedor DNS. Además del sitio de `DOMINIOS`, Caddy importa `/etc/caddy/sitios/*.caddy`; el compose monta ahí la
carpeta `sitios/` del cliente (no versionada; `desplegar.sh` la crea vacía). Ejemplo para un dominio en Linode mientras
`DOMINIOS` sigue en Cloudflare (`sitios/nuevo.caddy`, con `DNS_TOKEN_2` en el `.env`):

```
nuevo.ejemplo.mx {
	import tls_dns linode {$DNS_TOKEN_2}
	import chronos
}
```

`chronos` es el snippet con todas las reglas de la app, idénticas para todos los sitios. Se aplica con
`docker compose up -d web` (o `docker compose restart web` si solo cambió el archivo).

## Comportamiento

- `/api/*` quita el prefijo, hasta 100 MiB por petición (igual que `client_max_body_size 100M` de nginx), sin buffer de
  petición y con 60 s de timeout. No repite CORS (lo gestiona Express) ni acepta `X-Forwarded-*` entrantes.
- `/entorno.json` lo genera Caddy. No es un archivo del build: el service worker lo precachearía y quedaría viejo.
- `index.html`, `/sw.js` y `/manifest.webmanifest` con `no-cache`; `/assets/*` y `/workbox-*.js` con caché larga
  inmutable. `/sw*.js`, `/workbox-*.js` y `/assets/*` que no existen dan 404 (nunca HTML); no hay redirecciones.
- Los `*.map` dan 404 (el build los genera y Sentry los recibe si hay credenciales).
- Cualquier otra ruta sin archivo devuelve `index.html` (rutas del router sin `#`).

## Prueba de humo

```bash
bash infra/web/probar-web.sh          # construye chronos-web:prueba y comprueba todo sin TLS (~2 min con caché)
OMITIR_BUILD=1 bash infra/web/probar-web.sh   # reutiliza la imagen ya construida
```

Necesita Docker, `curl` y el puerto local `18080` (cámbialo con `PUERTO=`). Limpia sus contenedores y su red al terminar.
Incluye `caddy validate` con TLS para `cloudflare` y `linode`.

## Cambio de dominio con PWA

El service worker queda registrado por origen. Si el dominio viejo redirigiera todo al nuevo, los navegadores con el
service worker viejo seguirían mostrando la app desde su precaché, sus POST a `/api` recibirían 301 y `sw.js` no podría
actualizarse. Durante la transición pon **ambos dominios** en `DOMINIOS` (`nuevo.mx, viejo.mx`): los dos sirven la app
completa. Retira o redirige el viejo solo después de unas semanas, cuando los usuarios ya entren por el nuevo.
