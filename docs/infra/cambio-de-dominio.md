# Procedimiento: cambiar el dominio de un cliente (AMZ)

AMZ arranca en un subdominio del propietario y más adelante tendrá dominio propio. El cambio **no** es un corte: durante unas
semanas **ambos nombres sirven la app completa**.

1. **Nuevo registro DNS.** En la zona que corresponda (con Cloudflare, registro A sin proxy, nube gris) apunta `<dominio-nuevo>`
   a la IP del servidor (`<IP-AMZ>`). Elige cómo obtiene Caddy su certificado:
   - **Mismo proveedor DNS que el viejo** (`cloudflare` o `linode`): el token del `.env` debe tener permiso de edición DNS sobre la
     zona nueva además de la vieja (amplía el token o crea uno nuevo y cámbialo en el `.env`). Sigue con el paso 2.
   - **Otro proveedor** (p. ej. el viejo en Cloudflare y el nuevo en Linode): pon el token del nuevo en `DNS_TOKEN_2` del `.env` y
     crea `~/chronos-amz/sitios/nuevo.caddy` (ver `infra/web/README.md`, "Reto DNS por sitio"):

     ```
     <dominio-nuevo> {
     	import tls_dns linode {$DNS_TOKEN_2}
     	import chronos
     }
     ```

     En este caso **no** cambies `DOMINIOS` (sigue con el viejo); aplica con `docker compose up -d web` y continúa en el paso 3.
     Para retirar el viejo más tarde, pasa el dominio nuevo a `DOMINIOS`/`DNS_PROVEEDOR`/`DNS_TOKEN` y borra `sitios/nuevo.caddy`.
2. **Añade el dominio nuevo, sin quitar el viejo** (mismo proveedor). En `~/chronos-amz/.env` del servidor:

   ```
   DOMINIOS=<dominio-nuevo>, <subdominio-amz>
   ```

   El primero es el que usa la prueba de humo de `desplegar.sh`. Aplica el cambio recreando `web` (no hace falta tocar la API):

   ```bash
   cd ~/chronos-amz && docker compose up -d web
   docker compose logs --tail 30 web      # busca "certificate obtained" para el nombre nuevo
   curl -sI https://<dominio-nuevo>/ | head -n 1
   ```

   Caddy lee `DOMINIOS` al arrancar; los certificados viven en el volumen `caddy_data` y se conservan.
3. **Avisa a los usuarios** del nombre nuevo y de que el viejo seguirá funcionando unas semanas. Cada nombre es un origen distinto: la
   PWA instalada y la sesión no se trasladan solas; quien cambie de nombre debe iniciar sesión de nuevo (y reinstalar la PWA si la usaba).
   Los marcadores y enlaces enviados por correo a rutas del nombre viejo siguen funcionando mientras exista.
4. **Retira el viejo** tras unas semanas, cuando el acceso al nombre viejo (`docker compose logs web | grep <subdominio-amz>`) sea nulo o
   marginal: quita el nombre de `DOMINIOS`, `docker compose up -d web` y borra el registro DNS. Si prefieres una redirección 301 en vez de
   dejarlo caer, es un cambio en el Caddyfile (nueva versión de `chronos-web`); no se hace desde el `.env`.
5. **Por qué no redirigir antes de tiempo** (diseño, §8). El service worker queda registrado por origen. Si el nombre viejo
   redirigiera todo al nuevo, los navegadores con el service worker viejo seguirían mostrando la app desde su precaché; sus llamadas
   a `/api` recibirían 301 (los POST se rompen) y la actualización de `sw.js` fallaría, porque los navegadores no siguen
   redirecciones al actualizar un service worker. Con ambos nombres sirviendo la app, cada usuario migra a su ritmo y sin errores.
