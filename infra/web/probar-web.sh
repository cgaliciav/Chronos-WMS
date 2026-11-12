#!/usr/bin/env bash
# Prueba de humo de la imagen chronos-web (sin TLS): construye la imagen, la levanta con un "API" falso y comprueba
# el comportamiento que debe conservar Caddy respecto a nginx (spec §6). Uso: bash infra/web/probar-web.sh
# Variables opcionales: IMAGEN (por defecto chronos-web:prueba), OMITIR_BUILD=1 para reutilizar la imagen ya construida.
set -Eeuo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
IMAGEN="${IMAGEN:-chronos-web:prueba}"
VERSION_PRUEBA="9.9.9"
SUFIJO="$$"
RED="chronos-web-prueba-red-$SUFIJO"
API="chronos-web-prueba-api-$SUFIJO"
WEB="chronos-web-prueba-web-$SUFIJO"
TMP="$(mktemp -d)"
PUERTO="${PUERTO:-18080}"
URL="http://127.0.0.1:$PUERTO"
FALLOS=0
# Cloudflare valida el formato del token al arrancar (40 caracteres); este es falso pero con ese formato.
TOKEN_FALSO="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

limpiar() {
  docker rm -f "$WEB" "$API" >/dev/null 2>&1 || true
  docker network rm "$RED" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap limpiar EXIT

ok() { echo "  OK    $1"; }
falla() { echo "  FALLA $1 (esperaba: $2)"; FALLOS=$((FALLOS + 1)); }
# comprobar <descripcion> <esperado> <real>: el real debe contener lo esperado (grep -F, sin distinguir mayúsculas).
contiene() { if grep -qiF -- "$2" <<<"$3"; then ok "$1"; else falla "$1" "$2; obtuve: $(head -c 300 <<<"$3" | tr '\n' ' ')"; fi; }
no_contiene() { if grep -qiF -- "$2" <<<"$3"; then falla "$1" "no debe contener $2"; else ok "$1"; fi; }
cabeceras() { curl -s -o /dev/null -D - "$@" | tr -d '\r'; }
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# ---------- API falso: eco de ruta y cabeceras, /upload cuenta bytes, /lento tarda 50 s ----------
cat >"$TMP/api.js" <<'JS'
const http = require('http')
http.createServer((req, res) => {
  const cabeceras = { 'Content-Type': 'application/json' }
  if (req.url.startsWith('/lento')) {
    return setTimeout(() => { res.writeHead(200, cabeceras); res.end(JSON.stringify({ lento: true })) }, 50000)
  }
  let bytes = 0
  req.on('data', c => { bytes += c.length })
  req.on('end', () => {
    res.writeHead(200, cabeceras)
    res.end(JSON.stringify({ metodo: req.method, ruta: req.url, cabeceras: req.headers, bytes }))
  })
}).listen(4200)
JS

echo "== Construyendo $IMAGEN (VERSION=$VERSION_PRUEBA)"
if [ -z "${OMITIR_BUILD:-}" ]; then
  docker build -f "$AQUI/Dockerfile" --build-arg VERSION="$VERSION_PRUEBA" -t "$IMAGEN" "$RAIZ" >"$TMP/build.log" 2>&1 \
    || { tail -30 "$TMP/build.log"; echo "FALLA: no se pudo construir la imagen (¿existe infra/web/Dockerfile?)"; exit 1; }
fi

docker network create "$RED" >/dev/null
docker run -d --name "$API" --network "$RED" --network-alias api -v "$TMP/api.js:/api.js:ro" \
  node:24-bookworm-slim node /api.js >/dev/null
docker run -d --name "$WEB" --network "$RED" -p "127.0.0.1:$PUERTO:80" \
  -e DOMINIOS=:80 -e DNS_TOKEN="$TOKEN_FALSO" -e CLIENTE=amz -e ENTORNO=staging -e API_UPSTREAM=api:4200 "$IMAGEN" >/dev/null
for _ in $(seq 1 30); do [ "$(codigo "$URL/" || true)" = 200 ] && break; sleep 1; done

echo "== 0. El build lleva la versión (la usa el release de Sentry: chronos-wms-front@<version>)"
# El bundle minificado guarda la versión como constante (`9.9.9`) y arma el release con una plantilla.
if docker run --rm --entrypoint sh "$IMAGEN" -c "grep -l 'chronos-wms-front@' /srv/assets/*.js | xargs grep -l '\`$VERSION_PRUEBA\`'" | grep -q .; then
  ok "el bundle contiene el release chronos-wms-front@ y la versión $VERSION_PRUEBA"
else falla "versión en el bundle" "la constante $VERSION_PRUEBA junto a chronos-wms-front@ en /srv/assets/*.js"; fi

echo "== 1. /api quita el prefijo y manda X-Forwarded-For"
R="$(curl -s "$URL/api/groups?x=1")"
contiene "ruta recibida sin /api" '"ruta":"/groups?x=1"' "$R"
contiene "X-Forwarded-For presente" 'x-forwarded-for' "$R"
R="$(curl -s -H 'X-Forwarded-For: 6.6.6.6' "$URL/api/x")"
no_contiene "no acepta X-Forwarded-For entrante" '6.6.6.6' "$R"

echo "== 2. SPA: / y rutas del router devuelven index.html sin caché"
for ruta in / /catalogo/general; do
  H="$(cabeceras "$URL$ruta")"
  contiene "GET $ruta -> 200" ' 200' "$(head -1 <<<"$H")"
  contiene "GET $ruta text/html" 'content-type: text/html' "$H"
  contiene "GET $ruta no-cache" 'cache-control: no-cache' "$H"
done

echo "== 3. index.html, sw.js y manifest sin caché"
for ruta in /index.html /sw.js /manifest.webmanifest; do
  H="$(cabeceras "$URL$ruta")"
  contiene "GET $ruta -> 200 (sin redirección)" ' 200' "$(head -1 <<<"$H")"
  contiene "GET $ruta no-cache" 'cache-control: no-cache' "$H"
done
contiene "manifest con application/manifest+json" 'content-type: application/manifest+json' "$(cabeceras "$URL/manifest.webmanifest")"
contiene "sw.js es JavaScript" 'content-type: text/javascript' "$(cabeceras "$URL/sw.js")"

echo "== 4. Archivos con hash: caché larga"
ASSET="$(docker run --rm --entrypoint sh "$IMAGEN" -c "ls /srv/assets | grep -E '\.js$' | head -1")"
WORKBOX="$(docker run --rm --entrypoint sh "$IMAGEN" -c "ls /srv | grep -E '^workbox-.*\.js$' | head -1")"
[ -n "$ASSET" ] && [ -n "$WORKBOX" ] || { echo "FALLA: el build no trae assets/*.js o workbox-*.js"; exit 1; }
for ruta in "/assets/$ASSET" "/$WORKBOX"; do
  H="$(cabeceras "$URL$ruta")"
  contiene "GET $ruta -> 200" ' 200' "$(head -1 <<<"$H")"
  contiene "GET $ruta immutable" 'cache-control: public, max-age=31536000, immutable' "$H"
done

echo "== 5. Lo que falta o no se publica responde 404 y no HTML"
for ruta in /assets/no-existe.js /sw-inexistente.js /workbox-no.js "/assets/$ASSET.map"; do
  [ "$(codigo "$URL$ruta")" = 404 ] && ok "GET $ruta -> 404" || falla "GET $ruta" "404"
  no_contiene "GET $ruta no es HTML" '<!doctype' "$(curl -s "$URL$ruta")"
done

echo "== 6. /entorno.json y X-Environment"
H="$(cabeceras "$URL/entorno.json")"
contiene "entorno.json no-cache" 'cache-control: no-cache' "$H"
contiene "entorno.json JSON" 'content-type: application/json' "$H"
[ "$(curl -s "$URL/entorno.json")" = '{"cliente":"amz","entorno":"staging"}' ] && ok "cuerpo de entorno.json" \
  || falla "cuerpo de entorno.json" '{"cliente":"amz","entorno":"staging"}'
for ruta in / /entorno.json /api/x /assets/$ASSET; do
  contiene "X-Environment en $ruta" 'x-environment: staging' "$(cabeceras "$URL$ruta")"
done

echo "== 7. Subida de 100 MB y petición lenta (50 s)"
head -c $((100 * 1024 * 1024)) /dev/zero >"$TMP/grande.bin"
R="$(curl -s -X POST --data-binary @"$TMP/grande.bin" -H 'Content-Type: application/octet-stream' "$URL/api/upload")"
contiene "el API recibió los 100 MB completos" '"bytes":104857600' "$R"
INICIO=$SECONDS
R="$(curl -s --max-time 70 "$URL/api/lento")"
contiene "/api/lento responde tras $((SECONDS - INICIO)) s" '"lento":true' "$R"

echo "== 8. Con el API caído: front 200 y /api 502"
docker stop "$API" >/dev/null
[ "$(codigo "$URL/")" = 200 ] && ok "GET / -> 200" || falla "GET /" "200"
[ "$(codigo "$URL/api/x")" = 502 ] && ok "GET /api/x -> 502" || falla "GET /api/x" "502"

echo "== 9. caddy validate con TLS y ambos proveedores DNS"
COMUNES=(-e ACME_EMAIL=a@ejemplo.com -e CLIENTE=amz -e ENTORNO=staging -e API_UPSTREAM=api:4200)
for prov in cloudflare linode; do
  if docker run --rm -e DOMINIOS=ejemplo.com -e DNS_PROVEEDOR="$prov" -e DNS_TOKEN="$TOKEN_FALSO" "${COMUNES[@]}" "$IMAGEN" \
      caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >"$TMP/validate-$prov.log" 2>&1; then
    ok "caddy validate con $prov"
  else falla "caddy validate con $prov" "configuración válida"; tail -5 "$TMP/validate-$prov.log"; fi
done

echo "== 10. Reto DNS por sitio: resolvedores, propagación y sitio adicional con otro proveedor"
# adaptar <args docker...>: JSON de la configuración (última línea de `caddy adapt`; las anteriores son logs).
adaptar() { docker run --rm "${COMUNES[@]}" "$@" "$IMAGEN" caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile 2>/dev/null | tail -1; }
R="$(adaptar -e DOMINIOS=ejemplo.com -e DNS_TOKEN="$TOKEN_FALSO" -e DNS_RESOLVERS="1.1.1.1 1.0.0.1" \
  -e DNS_PROPAGACION_ESPERA=0s -e DNS_PROPAGACION_LIMITE=2m)"
contiene "por defecto: resolvedores 1.1.1.1 y 1.0.0.1" '"resolvers":["1.1.1.1","1.0.0.1"]' "$R"
contiene "por defecto: límite de propagación 2m" '"propagation_timeout":120000000000' "$R"
R="$(adaptar -e DOMINIOS=ejemplo.com -e DNS_TOKEN="$TOKEN_FALSO" -e DNS_PROPAGACION_ESPERA=20s -e DNS_PROPAGACION_LIMITE=-1)"
contiene "staging: sin comprobación de propagación (-1)" '"propagation_timeout":-1' "$R"
contiene "staging: espera de 20 s" '"propagation_delay":20000000000' "$R"
mkdir -p "$TMP/sitios"
printf 'nuevo.ejemplo.com {\n\timport tls_dns linode {$DNS_TOKEN_2}\n\timport chronos\n}\n' >"$TMP/sitios/nuevo.caddy"
R="$(adaptar -e "DOMINIOS=ejemplo.com, otro.ejemplo.com" -e DNS_PROVEEDOR=cloudflare -e DNS_TOKEN="$TOKEN_FALSO" \
  -e DNS_TOKEN_2=token-linode -v "$TMP/sitios:/etc/caddy/sitios:ro")"
contiene "DOMINIOS con dos nombres usa cloudflare" '"subjects":["ejemplo.com","otro.ejemplo.com"]' "$R"
contiene "sitio adicional nuevo.ejemplo.com" '"subjects":["nuevo.ejemplo.com"]' "$R"
contiene "el sitio adicional usa linode" '"name":"linode"' "$R"
contiene "el sitio adicional sirve la app (entorno.json)" '{\"cliente\":\"amz\"' "$R"

echo
if [ "$FALLOS" -gt 0 ]; then echo "RESULTADO: $FALLOS comprobaciones fallaron"; exit 1; fi
echo "RESULTADO: todas las comprobaciones OK"
