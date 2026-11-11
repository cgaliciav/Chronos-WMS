#!/usr/bin/env bash
# Despliegue genérico de un cliente (AMZ, Sony) con Caddy en Docker. Lo usan el wrapper de staging y el
# procedimiento de producción. Nunca imprime el `.env` remoto.
#
# Uso:
#   desplegar.sh --host <ssh> --dir <ruta remota> --cliente amz|sony --version-web V --version-api V
#                [--staging] [--sembrar-admin <correo> --admin-nombre <nombre>] [--permitir-migrar]
#                [--antes-de-migrar <comando local>] [--sin-snapshot] [--simular]
#   Sony con --permitir-migrar exige --antes-de-migrar (snapshot de los datos compartidos) o, bajo tu
#   responsabilidad, --sin-snapshot.
#
# Requisito: <dir>/.env ya existe en el servidor (desde amz/.env.example o sony/.env.caddy.example, con secretos).
# Versiones con sufijo de entorno, p. ej. 4.9.0-s. `--simular` muestra los pasos remotos sin ejecutar nada.
# Los scripts remotos van entre comillas simples a propósito: se expanden en el servidor.
# shellcheck disable=SC2016
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

uso() { sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2; }
falla() { echo "Error: $*" >&2; exit 1; }

HOST="" DIR="" CLIENTE="" V_WEB="" V_API="" STAGING=0 CORREO="" NOMBRE="" PERMITIR=0 ANTES="" SIN_SNAPSHOT=0 SIMULAR=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="${2:?falta valor de --host}"; shift 2 ;;
    --dir) DIR="${2:?falta valor de --dir}"; shift 2 ;;
    --cliente) CLIENTE="${2:?falta valor de --cliente}"; shift 2 ;;
    --version-web) V_WEB="${2:?falta valor de --version-web}"; shift 2 ;;
    --version-api) V_API="${2:?falta valor de --version-api}"; shift 2 ;;
    --staging) STAGING=1; shift ;;
    --sembrar-admin) CORREO="${2:?falta valor de --sembrar-admin}"; shift 2 ;;
    --admin-nombre) NOMBRE="${2:?falta valor de --admin-nombre}"; shift 2 ;;
    --permitir-migrar) PERMITIR=1; shift ;;
    --antes-de-migrar) ANTES="${2:?falta valor de --antes-de-migrar}"; shift 2 ;;
    --sin-snapshot) SIN_SNAPSHOT=1; shift ;;
    --simular) SIMULAR=1; shift ;;
    -h|--help) uso; exit 0 ;;
    *) uso; falla "argumento desconocido: $1" ;;
  esac
done

[[ -n "$HOST" && -n "$DIR" && -n "$CLIENTE" && -n "$V_WEB" && -n "$V_API" ]] || { uso; falla "faltan argumentos obligatorios"; }
[[ "$CLIENTE" == amz || "$CLIENTE" == sony ]] || falla "--cliente debe ser amz o sony"
patron='^[0-9]+\.[0-9]+\.[0-9]+(-[ds])?$'
[[ "$V_WEB" =~ $patron ]] || falla "--version-web '$V_WEB' no sigue X.Y.Z[-s]"
[[ "$V_API" =~ $patron ]] || falla "--version-api '$V_API' no sigue X.Y.Z[-s]"
if [[ -n "$CORREO" && -z "$NOMBRE" ]]; then falla "--sembrar-admin necesita --admin-nombre"; fi
if [[ -z "$CORREO" && -n "$NOMBRE" ]]; then falla "--admin-nombre solo tiene sentido con --sembrar-admin"; fi
if [[ "$CLIENTE" == sony && $PERMITIR -eq 1 && -z "$ANTES" && $SIN_SNAPSHOT -eq 0 ]]; then
  falla "--cliente sony --permitir-migrar migraría datos compartidos sin copia: añade --antes-de-migrar <snapshot> o, bajo tu responsabilidad, --sin-snapshot"
fi
[[ "$DIR" == /* ]] || falla "--dir debe ser una ruta absoluta"

ARCHIVOS=(-f compose.yml)
(( STAGING )) && ARCHIVOS+=(-f compose.staging.yml)
COMPOSE="docker compose ${ARCHIVOS[*]}"

# Ejecuta un script bash en el servidor, ya en <dir>. Argumentos posicionales: $1, $2…
remoto() {
  local script="$1"; shift
  if (( SIMULAR )); then
    echo "[simular] ssh $HOST (cd $DIR) <<< $script" >&2
    return 0
  fi
  # shellcheck disable=SC2029
  ssh "$HOST" "cd $(printf '%q' "$DIR") && bash -s -- $(printf '%q ' "$@")" <<<"$script"
}

RESULTADO="fallo"
registrar() {
  local linea
  linea="$(date -u +%FT%TZ) cliente=$CLIENTE web=$V_WEB api=$V_API staging=$STAGING resultado=$RESULTADO"
  if (( SIMULAR )); then echo "[simular] despliegues.log << $linea" >&2; return 0; fi
  # shellcheck disable=SC2029
  ssh "$HOST" "echo $(printf '%q' "$linea") >> $(printf '%q' "$DIR")/despliegues.log" || true
}
trap registrar EXIT

echo "== Despliegue de $CLIENTE en $HOST:$DIR (web $V_WEB, api $V_API)$( (( STAGING )) && echo ' [staging]' )"

# 0. Directorio remoto, .env y datos con el dueño que espera la imagen del API (usuario node, uid 1000).
remoto '
set -euo pipefail
[ -f .env ] || { echo "Error: falta $PWD/.env (cópialo desde infra/clientes/*/.env*.example y llena los secretos)" >&2; exit 1; }
for clave in DATOS_DIR IMAGEN_WEB IMAGEN_API DOMINIOS DNS_TOKEN ACME_EMAIL DB_DATABASE_NAME DB_PASSWORD DB_ROOT_PASSWORD JWTSECRET CONFIG_CLAVE SMTP_FROM CLIENTE ENTORNO; do
  grep -Eq "^${clave}=.+" .env || { echo "Error: ${clave} está vacío o falta en .env" >&2; exit 1; }
done
datos=$(grep -E "^DATOS_DIR=" .env | tail -n1 | cut -d= -f2-)
sudo mkdir -p "$datos/exogrid" "$datos/db_data/mysql"
[ "$(stat -c %u "$datos/exogrid")" = 1000 ] || sudo chown -R 1000:1000 "$datos/exogrid"
' || falla "preparación del servidor"

# 1. Archivos de compose.
if (( SIMULAR )); then
  echo "[simular] rsync compose.yml$( (( STAGING )) && echo ' compose.staging.yml' ) -> $HOST:$DIR/" >&2
else
  ORIGEN=("$AQUI/compose.yml")
  (( STAGING )) && ORIGEN+=("$AQUI/compose.staging.yml")
  rsync -az "${ORIGEN[@]}" "$HOST:$DIR/" || falla "rsync de los compose"
fi

# 2. Versiones de las imágenes en el .env remoto (se conserva el espacio de nombres) y pull.
remoto '
set -euo pipefail
cambiar() {
  grep -Eq "^$1=.+:[^:/]+$" .env || { echo "Error: $1 en .env debe tener la forma espacio/nombre:etiqueta" >&2; exit 1; }
  sed -i -E "s|^($1=.+):[^:/]+\$|\1:$2|" .env
}
cambiar IMAGEN_WEB "$1"
cambiar IMAGEN_API "$2"
shift 2
"$@" pull
' "$V_WEB" "$V_API" docker compose "${ARCHIVOS[@]}" || falla "actualización de imágenes o pull"

# 3. Migraciones: base arriba, `show` (código 1 + líneas "[ ]" = pendientes) y `run` si procede.
remoto '
set -euo pipefail
docker compose "$@" up -d --wait mariadb
' "${ARCHIVOS[@]}" || falla "mariadb no arrancó"

if (( SIMULAR )); then
  echo "[simular] migrar.js show (se supone sin pendientes)" >&2
else
  # En el primer arranque con datos vacíos MariaDB puede tardar en abrir TCP y crear la base/usuario: mientras la
  # salida no tenga ninguna línea "[ ]"/"[X]" se reintenta (hasta ~60 s) antes de darlo por error.
  for intento in 1 2 3 4 5 6 7 8 9 10 11 12; do
    set +e
    SALIDA_SHOW="$(remoto 'docker compose "$@" run --rm -T api node build/migrar.js show </dev/null' "${ARCHIVOS[@]}" 2>&1)"
    RC_SHOW=$?
    set -e
    (( RC_SHOW == 0 )) && break
    grep -qE '^\[[ X]\]' <<<"$SALIDA_SHOW" && break
    echo "== migrar.js show aún no conecta (intento $intento/12); reintento en 5 s" >&2
    sleep 5
  done
  echo "$SALIDA_SHOW" | grep -E '^\[[ X]\]' || true
  if (( RC_SHOW == 1 )) && grep -q '^\[ \]' <<<"$SALIDA_SHOW"; then
    if [[ "$CLIENTE" == sony && $PERMITIR -eq 0 ]]; then
      RESULTADO="detenido: migraciones pendientes en sony"
      falla "hay migraciones pendientes en Sony; aplícalas con el procedimiento de producción o repite con --permitir-migrar"
    fi
    if [[ -n "$ANTES" ]]; then
      echo "== Antes de migrar: $ANTES"
      bash -c "$ANTES" || { RESULTADO="detenido: falló --antes-de-migrar"; falla "falló --antes-de-migrar"; }
    fi
    echo "== Aplicando migraciones pendientes"
    remoto 'docker compose "$@" run --rm -T api node build/migrar.js run </dev/null' "${ARCHIVOS[@]}" \
      || { RESULTADO="fallo en migrar.js run"; falla "falló migrar.js run"; }
  elif (( RC_SHOW != 0 )); then
    echo "$SALIDA_SHOW" | tail -n 20 >&2
    RESULTADO="fallo en migrar.js show"
    falla "migrar.js show terminó con código $RC_SHOW"
  else
    echo "== Sin migraciones pendientes"
  fi
fi

# 4. Administrador inicial (base nueva): muestra la salida porque trae la contraseña temporal.
if [[ -n "$CORREO" ]]; then
  echo "== Sembrando la base"
  set +e
  remoto 'docker compose "$@" </dev/null' "${ARCHIVOS[@]}" run --rm -T api node build/sembrar.js --admin-correo "$CORREO" --admin-nombre "$NOMBRE"
  RC_SEMBRAR=$?
  set -e
  if (( RC_SEMBRAR == 3 )); then RESULTADO="detenido: base en uso"; falla "la base ya está en uso; no se sembró"; fi
  (( RC_SEMBRAR == 0 )) || { RESULTADO="fallo en sembrar.js"; falla "sembrar.js terminó con código $RC_SEMBRAR"; }
fi

# 5. Stack completo y prueba de humo.
remoto '
set -euo pipefail
docker compose "$@" up -d
' "${ARCHIVOS[@]}" || falla "docker compose up -d"

if (( SIMULAR )); then
  echo "[simular] curl -sf https://<primer dominio>/ y /api/" >&2
  RESULTADO="simulado"
  exit 0
fi

echo "== Prueba de humo"
remoto '
set -euo pipefail
dominios=$(grep -E "^DOMINIOS=" .env | tail -n1 | cut -d= -f2-)
dominio=$(echo "${dominios%%,*}" | tr -d "[:space:]\"")
# `:80` (modo sin TLS) no tiene nombre: se prueba por HTTP local.
if [[ "$dominio" == :* ]]; then base="http://127.0.0.1${dominio}"; resolver=(); else
  base="https://$dominio"
  # En staging el dominio puede apuntar a otra IP: se resuelve a esta máquina.
  if [ "$1" = 1 ]; then resolver=(--resolve "$dominio:443:127.0.0.1"); else resolver=(); fi
fi
# El certificado puede tardar en emitirse en el primer arranque: reintenta hasta ~2 min.
for ruta in / /api/; do
  curl -sf --retry 12 --retry-delay 10 --retry-all-errors "${resolver[@]}" -o /dev/null "$base$ruta" \
    || { echo "Error: $base$ruta no responde" >&2; exit 1; }
  echo "OK $base$ruta"
done
' "$STAGING" || { RESULTADO="fallo en la prueba de humo"; falla "la prueba de humo falló (revisa: $COMPOSE logs web api)"; }

RESULTADO="ok"
echo "== Despliegue terminado"
