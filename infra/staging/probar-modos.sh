#!/usr/bin/env bash
# Pruebas locales de staging-modo.sh y desplegar-caddy.sh SIN tocar la VM ni libvirt.
#
# Con VM_SSH_LOCAL=1 las funciones de lib.sh ejecutan los scripts "remotos" con `bash -c` en esta máquina, por el mismo
# camino y con los mismos argumentos que en la VM. Los comandos del sistema (docker, docker-compose, systemctl, ss,
# pgrep, sudo, apt-get, virsh) son stubs en un PATH temporal que leen/escriben un estado en un directorio temporal.
# Uso: ./probar-modos.sh   (código 0 si todo pasa)
# shellcheck disable=SC2015  # `[[ ]] && ok_ || mal` es a propósito: ok_ siempre sale con 0
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
S="$T/estado"; BIN="$T/bin"; mkdir -p "$S" "$BIN" "$T/home" "$T/cache"

# ---------- stubs ----------
cat >"$BIN/docker" <<'EOF'
#!/usr/bin/env bash
S="${STUB_ESTADO:?}"
echo "docker $*" >>"$S/llamadas.log"
case "$1" in
  compose)
    case "$2" in
      version) [ -f "$S/compose_v2" ] || { echo "docker: 'compose' is not a docker command" >&2; exit 1; }; echo "Docker Compose version v2.stub" ;;
      -p) [ "$4" = stop ] && { grep -v "^$3 " "$S/docker_ps" >"$S/tmp" || true; mv "$S/tmp" "$S/docker_ps"; } ;;
      *) if [[ " $* " == *" pull "* ]]; then  # desplegar.sh: registra las variables de imagen que ve el pull
           echo "IMAGEN_WEB=$IMAGEN_WEB IMAGEN_API=$IMAGEN_API" >>"$S/pulls.log"
           [ "${STUB_PULL_FALLA:-0}" = 1 ] && exit 1
         fi ;;  # -f … up -d
    esac ;;
  ps) # Como Docker: varios --filter label=com.docker.compose.project=… se combinan con Y (dos proyectos distintos => vacío).
      n=$(printf '%s\n' "$@" | grep -c '^label=com.docker.compose.project=' || true)
      [ "$n" -gt 1 ] && exit 0
      cat "$S/docker_ps" ;;
  stop) grep -v " $2\$" "$S/docker_ps" >"$S/tmp" || true; mv "$S/tmp" "$S/docker_ps" ;;
  login) cat >"$S/login_stdin"; echo "$*" >"$S/login_args"; mkdir -p "$HOME/.docker"; echo "{\"auths\":{\"https://index.docker.io/v1/\":{}}}" >"$HOME/.docker/config.json" ;;
esac
exit 0
EOF
cat >"$BIN/docker-compose" <<'EOF'
#!/usr/bin/env bash
S="${STUB_ESTADO:?}"
echo "docker-compose $*" >>"$S/llamadas.log"
case "$1" in
  stop) if [ "${STUB_V1_DEJA_HUERFANO:-0}" = 1 ]; then grep -v " teleset-almacen_" "$S/docker_ps" >"$S/tmp" || true
        else : >"$S/tmp"; grep -v "^teleset-almacen " "$S/docker_ps" >"$S/tmp" || true; fi; mv "$S/tmp" "$S/docker_ps" ;;
  up) echo "teleset-almacen teleset-almacen_backend_1" >>"$S/docker_ps" ;;
esac
exit 0
EOF
cat >"$BIN/systemctl" <<'EOF'
#!/usr/bin/env bash
S="${STUB_ESTADO:?}"
echo "systemctl $*" >>"$S/llamadas.log"
case "$1" in
  is-active) [ -f "$S/nginx_activo" ] ;;
  stop|disable) [ -f "$S/nginx_atascado" ] || rm -f "$S/nginx_activo"; if [ "$1" = disable ]; then touch "$S/nginx_deshabilitado"; fi ;;
  start) touch "$S/nginx_activo" ;;
  enable) rm -f "$S/nginx_deshabilitado"; touch "$S/nginx_activo" ;;
esac
EOF
cat >"$BIN/ss" <<'EOF'
#!/usr/bin/env bash
cat "${STUB_ESTADO:?}/puertos"
EOF
cat >"$BIN/pgrep" <<'EOF'
#!/usr/bin/env bash
# pgrep -x NOMBRE: imprime los pids del archivo "procesos" (líneas "nombre pid")
salida=$(grep "^$2 " "${STUB_ESTADO:?}/procesos") || exit 1
cut -d' ' -f2 <<<"$salida"
EOF
cat >"$BIN/sudo" <<'EOF'
#!/usr/bin/env bash
[ "$1" = chown ] && exit 0   # el dueño real no importa en pruebas
exec env "$@"
EOF
cat >"$BIN/apt-get" <<'EOF'
#!/usr/bin/env bash
echo "apt-get $*" >>"${STUB_ESTADO:?}/llamadas.log"; touch "${STUB_ESTADO}/compose_v2"
EOF
cat >"$BIN/virsh" <<'EOF'
#!/usr/bin/env bash
S="${STUB_ESTADO:?}"
echo "virsh $*" >>"$S/llamadas.log"
case "$3" in
  snapshot-list) cat "$S/snapshots" ;;
  snapshot-create-as) echo "$5" >>"$S/snapshots" ;;
esac
exit 0
EOF
# Para desplegar.sh (ssh/rsync/curl): "ssh <host> <comando>" ejecuta el comando aquí; rsync no copia nada; curl falla con
# código 60 ante un certificado "no confiable" (STUB_CERT_NO_CONFIABLE=1) salvo que se pase -k, como el curl real.
cat >"$BIN/ssh" <<'EOF'
#!/usr/bin/env bash
shift; exec bash -c "$1"
EOF
cat >"$BIN/rsync" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat >"$BIN/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >>"${STUB_ESTADO:?}/curl.log"
[[ " $* " == *" https://"* ]] || exit 0
if [ "${STUB_CERT_NO_CONFIABLE:-0}" = 1 ] && [[ " $* " != *" -k "* ]] && [[ " $* " != *" -skv "* ]]; then exit 60; fi
[[ " $* " == *" -skv "* ]] && echo "* issuer: C=US; O=(STAGING) Let's Encrypt; CN=(STAGING) Pretend Pear X1" >&2
exit 0
EOF
chmod +x "$BIN"/*

# ---------- entorno de prueba ----------
export PATH="$BIN:$PATH" HOME="$T/home" STUB_ESTADO="$S" VM_SSH_LOCAL=1 CACHE_DIR="$T/cache"
export AMZ_DIR_REMOTE="$T/chronos-amz" SONY_CADDY_DIR_REMOTE="$T/chronos-sony" STAGING_DIR_REMOTE="$T/teleset-almacen" MODO_FILE_REMOTE="$T/staging-modo"
unset STAGING_MODO_SIMULADO SIMULAR

PASARON=0; FALLARON=0
ok_() { PASARON=$((PASARON + 1)); echo "  ok   $1"; }
mal() { FALLARON=$((FALLARON + 1)); echo "  FALLA $1"; }
espera() { # descripción comando… : debe salir con 0
  local d="$1"; shift
  if "$@" >/dev/null 2>&1; then ok_ "$d"; else mal "$d"; fi
}
contiene() { grep -q -- "$2" <<<"$1"; }

reiniciar() { # estado inicial: sony-nginx en marcha, compose v2 instalado
  : >"$S/llamadas.log"; : >"$S/puertos"; : >"$S/procesos"; : >"$S/snapshots"
  printf 'teleset-almacen teleset-almacen_backend_1\nteleset-almacen teleset-almacen_mariadb_1\nteleset-almacen 4a011a7b6b85_teleset-almacen_frontend_1\n' >"$S/docker_ps"
  touch "$S/nginx_activo" "$S/compose_v2"; rm -f "$S/nginx_atascado"
  echo sony-nginx >"$MODO_FILE_REMOTE"
  rm -rf "$T/teleset-almacen"; mkdir -p "$T/teleset-almacen"
  unset STUB_V1_DEJA_HUERFANO
}
modo() { cat "$MODO_FILE_REMOTE"; }
modos() { "$AQUI/staging-modo.sh" "$@" 2>&1; }
caddy() { "$AQUI/desplegar-caddy.sh" "$@" 2>&1; }
orden() { # a b : la llamada a aparece antes que b en llamadas.log
  local ia ib
  ia=$(grep -n -- "$1" "$S/llamadas.log" | head -1 | cut -d: -f1); ib=$(grep -n -- "$2" "$S/llamadas.log" | head -1 | cut -d: -f1)
  [[ -n "$ia" && -n "$ib" && "$ia" -lt "$ib" ]]
}

echo "== 0. Sintaxis de los scripts remotos (bash -n sobre cada script, extraído con SIMULAR_VERBOSO)"
reiniciar
for m in caddy-amz sony-nginx caddy-sony; do
  SIMULAR_VERBOSO=1 "$AQUI/staging-modo.sh" "$m" -y --simular 2>&1 | sed 's/\x1b\[[0-9;]*m//g' \
    | awk '/^\[simular\]     \| /{ sub(/^\[simular\]     \| /, ""); print; next } /^\[simular\] remoto:/ { print "#--CORTE--" }' >"$T/scripts-$m.txt"
  espera "bash -n de los scripts de $m" bash -n "$T/scripts-$m.txt"
done

echo "== 1. --preparar"
reiniciar; rm -f "$MODO_FILE_REMOTE" "$S/compose_v2"
printf 'DB_ROOT_PASSWORD=raiz-v1/+=\nDB_PASSWORD=clave-v1\nJWTSECRET=jwt-v1\n' >"$T/teleset-almacen/.env"
SALIDA=$(printf '%s\n' amz-staging.ejemplo.com TOKEN-CF-123 TOKEN-LIN-456 correo@ejemplo.com exogrid TOKEN-DH-789 \
  | STAGING_PREPARAR_STDIN=1 "$AQUI/staging-modo.sh" --preparar 2>&1); RC=$?
[[ $RC -eq 0 ]] && ok_ "--preparar termina con 0" || { mal "--preparar rc=$RC"; echo "$SALIDA" | grep -v "^\[.*Falló en línea" | head -8; }
espera "instaló docker-compose-v2" grep -q "apt-get .*docker-compose-v2" "$S/llamadas.log"
espera "registró el modo inicial sony-nginx" test "$(modo 2>/dev/null)" = sony-nginx
for d in "$AMZ_DIR_REMOTE" "$SONY_CADDY_DIR_REMOTE"; do
  espera "$(basename "$d")/.env existe con modo 600" test "$(stat -c %a "$d/.env" 2>/dev/null)" = 600
  espera "$(basename "$d"): compose.yml y compose.staging.yml copiados" test -f "$d/compose.yml" -a -f "$d/compose.staging.yml"
done
espera "AMZ: DOMINIOS y token de Cloudflare" grep -q '^DOMINIOS=amz-staging.ejemplo.com$' "$AMZ_DIR_REMOTE/.env"
espera "AMZ: DNS_TOKEN" grep -q '^DNS_TOKEN=TOKEN-CF-123$' "$AMZ_DIR_REMOTE/.env"
espera "AMZ: ACME_CA de pruebas" grep -q '^ACME_CA=https://acme-staging-v02' "$AMZ_DIR_REMOTE/.env"
espera "AMZ: secretos aleatorios no vacíos" bash -c "grep -Eq '^DB_PASSWORD=.{16,}' '$AMZ_DIR_REMOTE/.env' && grep -Eq '^JWTSECRET=.{30,}' '$AMZ_DIR_REMOTE/.env'"
espera "Sony: DOMINIOS y token de Linode" bash -c "grep -q '^DOMINIOS=staging.telesetalmacen.com$' '$SONY_CADDY_DIR_REMOTE/.env' && grep -q '^DNS_TOKEN=TOKEN-LIN-456$' '$SONY_CADDY_DIR_REMOTE/.env'"
espera "Sony: credenciales copiadas del .env v1" bash -c "grep -qxF 'DB_ROOT_PASSWORD=raiz-v1/+=' '$SONY_CADDY_DIR_REMOTE/.env' && grep -qxF 'DB_PASSWORD=clave-v1' '$SONY_CADDY_DIR_REMOTE/.env' && grep -qxF 'JWTSECRET=jwt-v1' '$SONY_CADDY_DIR_REMOTE/.env'"
espera "Sony: DATOS_DIR apunta al stack v1" grep -qxF "DATOS_DIR=$STAGING_DIR_REMOTE" "$SONY_CADDY_DIR_REMOTE/.env"
espera "Sony: CONFIG_CLAVE igual en v1 y chronos-sony" bash -c "[ -n \"\$(grep '^CONFIG_CLAVE=' '$T/teleset-almacen/.env')\" ] && [ \"\$(grep '^CONFIG_CLAVE=' '$T/teleset-almacen/.env')\" = \"\$(grep '^CONFIG_CLAVE=' '$SONY_CADDY_DIR_REMOTE/.env')\" ]"
espera "docker login recibió el token por stdin" test "$(cat "$S/login_stdin" 2>/dev/null)" = TOKEN-DH-789
espera "docker login -u exogrid --password-stdin (el token no va en argumentos)" bash -c "grep -q -- '-u exogrid --password-stdin' '$S/login_args' && ! grep -q TOKEN-DH '$S/login_args' '$S/llamadas.log'"
espera "ningún secreto en la salida" bash -c "! grep -E 'TOKEN-(CF|LIN|DH)|raiz-v1|clave-v1|jwt-v1' <<<\"\$1\"" _ "$SALIDA"
echo "  -- segunda corrida: no sobrescribe"
cp "$AMZ_DIR_REMOTE/.env" "$T/amz.env.1"; cp "$SONY_CADDY_DIR_REMOTE/.env" "$T/sony.env.1"; rm -f "$S/login_stdin"
SALIDA2=$(printf '\n\n\n\n\n\n' | STAGING_PREPARAR_STDIN=1 "$AQUI/staging-modo.sh" --preparar 2>&1); RC=$?
[[ $RC -eq 0 ]] && ok_ "segunda corrida termina con 0" || { mal "segunda corrida rc=$RC"; echo "$SALIDA2" | tail -5; }
espera "AMZ .env intacto" cmp -s "$T/amz.env.1" "$AMZ_DIR_REMOTE/.env"
espera "Sony .env intacto" cmp -s "$T/sony.env.1" "$SONY_CADDY_DIR_REMOTE/.env"
espera "no repite docker login (ya hay sesión)" test ! -e "$S/login_stdin"

echo "== 2. Cambios de modo"
reiniciar
SAL=$(modos caddy-amz); RC=$?
[[ $RC -eq 0 ]] && ok_ "sony-nginx -> caddy-amz termina con 0" || { mal "sony-nginx -> caddy-amz rc=$RC"; echo "$SAL" | tail -5; }
espera "modo = caddy-amz" test "$(modo)" = caddy-amz
espera "v1 detenido (incluido el contenedor huérfano)" bash -c "! grep -q teleset-almacen '$S/docker_ps'"
espera "nginx detenido" test ! -f "$S/nginx_activo"
espera "nginx deshabilitado (no vuelve tras reiniciar la VM)" bash -c "grep -q 'systemctl disable --now nginx' '$S/llamadas.log' && [ -f '$S/nginx_deshabilitado' ]"
espera "sin despliegue previo no se hace 'up' de chronos-amz" bash -c "! grep -q 'compose -f compose.yml' '$S/llamadas.log'"
espera "sin snapshot (no aplica a caddy-amz)" test ! -s "$S/snapshots"

echo "  -- v1 deja un contenedor huérfano en marcha: se detiene explícitamente"
reiniciar; export STUB_V1_DEJA_HUERFANO=1
SAL=$(modos caddy-amz); RC=$?
[[ $RC -eq 0 ]] && ok_ "con huérfano: cambio correcto" || { mal "con huérfano rc=$RC"; echo "$SAL" | tail -5; }
espera "docker stop del huérfano" grep -q 'docker stop 4a011a7b6b85_teleset-almacen_frontend_1' "$S/llamadas.log"
unset STUB_V1_DEJA_HUERFANO

echo "  -- caddy-sony: primera vez toma snapshot, antes de encender y con todo apagado"
reiniciar
SAL=$(modos caddy-sony); RC=$?
[[ $RC -eq 0 ]] && ok_ "sony-nginx -> caddy-sony termina con 0" || { mal "caddy-sony rc=$RC"; echo "$SAL" | tail -5; }
espera "snapshot pre-caddy-sony-* creado" grep -q '^pre-caddy-sony-[0-9]\{8\}-[0-9]\{4\}$' "$S/snapshots"
espera "el snapshot va después de detener v1" orden 'docker-compose stop' 'snapshot-create-as'
espera "modo = caddy-sony" test "$(modo)" = caddy-sony
echo "  -- segunda entrada: no repite el snapshot; con despliegue previo hace 'up'"
echo "2026 cliente=sony resultado=ok" >"$SONY_CADDY_DIR_REMOTE/despliegues.log"
modos sony-nginx >/dev/null; N1=$(wc -l <"$S/snapshots"); modos caddy-sony >/dev/null; N2=$(wc -l <"$S/snapshots")
espera "no hay segundo snapshot" test "$N1" = "$N2"
espera "con despliegue previo: docker compose up -d" grep -q 'docker compose -f compose.yml -f compose.staging.yml up -d' "$S/llamadas.log"

echo "  -- caddy-sony -> sony-nginx: detiene chronos-* ANTES de levantar v1 y nginx"
reiniciar; mkdir -p "$SONY_CADDY_DIR_REMOTE"; echo "chronos-sony chronos-sony-mariadb-1" >"$S/docker_ps"; echo caddy-sony >"$MODO_FILE_REMOTE"; : >"$S/llamadas.log"; rm -f "$S/nginx_activo"
SAL=$(modos sony-nginx); RC=$?
[[ $RC -eq 0 ]] && ok_ "caddy-sony -> sony-nginx termina con 0" || { mal "-> sony-nginx rc=$RC"; echo "$SAL" | tail -5; }
espera "compose -p chronos-amz stop antes de docker-compose up" orden 'docker compose -p chronos-amz stop' 'docker-compose up'
espera "compose -p chronos-sony stop antes de docker-compose up" orden 'docker compose -p chronos-sony stop' 'docker-compose up'
espera "docker-compose up antes de systemctl enable --now nginx" orden 'docker-compose up' 'systemctl enable --now nginx'
espera "nginx activo y modo = sony-nginx" bash -c "[ -f '$S/nginx_activo' ] && [ \"\$(cat '$MODO_FILE_REMOTE')\" = sony-nginx ]"
espera "nginx habilitado de nuevo (enable --now)" bash -c "[ ! -f '$S/nginx_deshabilitado' ] && grep -q 'systemctl enable --now nginx' '$S/llamadas.log'"

echo "== 3. Negativas del cambio de modo"
reiniciar; export STUB_V1_DEJA_HUERFANO=1
# `docker stop` del stub no hace nada y el stack v1 deja su huérfano: sigue un contenedor de teleset-almacen en marcha
cp "$BIN/docker" "$BIN/docker.real"; cat >"$BIN/docker" <<'EOF'
#!/usr/bin/env bash
[ "$1" = stop ] && exit 0
exec "$(dirname "$0")/docker.real" "$@"
EOF
chmod +x "$BIN/docker" "$BIN/docker.real"
SAL=$(modos caddy-amz); RC=$?
[[ $RC -ne 0 ]] && ok_ "rechaza si un contenedor de teleset-almacen sigue en marcha (rc=$RC)" || mal "no rechazó con teleset-almacen en marcha"
contiene "$SAL" "siguen en marcha" && ok_ "mensaje: siguen en marcha" || mal "sin mensaje 'siguen en marcha'"
espera "el modo queda en-transicion" test "$(modo)" = en-transicion
espera "no se tomó snapshot ni se encendió nada" bash -c "! grep -q 'snapshot-create-as\|compose -f\|enable --now nginx' '$S/llamadas.log'"
cp "$BIN/docker.real" "$BIN/docker"; rm "$BIN/docker.real"; unset STUB_V1_DEJA_HUERFANO

reiniciar; echo "mariadbd 4242" >"$S/procesos"
SAL=$(modos caddy-sony); RC=$?
[[ $RC -ne 0 ]] && ok_ "rechaza si pgrep reporta un mariadbd (rc=$RC)" || mal "no rechazó con mariadbd en marcha"
contiene "$SAL" "MariaDB" && ok_ "mensaje menciona MariaDB" || mal "sin mensaje de MariaDB"
espera "sin snapshot ni encendido tras el rechazo" bash -c "! grep -q 'snapshot-create-as\|compose -f\|enable --now nginx' '$S/llamadas.log'"

reiniciar; echo "LISTEN 0 511 0.0.0.0:80 0.0.0.0:*" >"$S/puertos"
SAL=$(modos caddy-amz); RC=$?
[[ $RC -ne 0 ]] && ok_ "rechaza si el puerto 80 está ocupado (rc=$RC)" || mal "no rechazó con :80 ocupado"
contiene "$SAL" "80/443" && ok_ "mensaje de puertos" || mal "sin mensaje de puertos"

reiniciar; touch "$S/nginx_atascado"
SAL=$(modos caddy-amz); RC=$?
[[ $RC -ne 0 ]] && ok_ "rechaza si nginx no se detiene (rc=$RC)" || mal "no rechazó con nginx activo"

echo "== 4. desplegar-caddy.sh (--solo-comprobar)"
reiniciar; echo caddy-amz >"$MODO_FILE_REMOTE"; : >"$S/docker_ps"; rm -f "$S/nginx_activo"
SAL=$(caddy amz --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -eq 0 ]] && ok_ "modo correcto y nada ajeno: pasa" || { mal "amz con modo correcto rc=$RC"; echo "$SAL" | tail -5; }
SAL=$(caddy sony --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -ne 0 ]] && contiene "$SAL" "debe ser 'caddy-sony'" && ok_ "rechaza sony con modo caddy-amz" || mal "no rechazó el desajuste de modo"
echo "teleset-almacen teleset-almacen_mariadb_1" >"$S/docker_ps"
SAL=$(caddy amz --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -ne 0 ]] && contiene "$SAL" "otros stacks" && ok_ "rechaza con un contenedor v1 en marcha (modo dice caddy-amz)" || { mal "no rechazó el stack ajeno"; echo "$SAL" | tail -4; }
echo caddy-sony >"$MODO_FILE_REMOTE"; echo "teleset-almacen teleset-almacen_mariadb_1" >"$S/docker_ps"; echo "mariadbd 11" >"$S/procesos"
SAL=$(caddy sony --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -ne 0 ]] && ok_ "sony: rechaza con el MariaDB del v1 corriendo" || mal "sony no rechazó el v1 en marcha"
: >"$S/docker_ps"; echo "mariadbd 11" >"$S/procesos"
SAL=$(caddy sony --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -ne 0 ]] && contiene "$SAL" "MariaDB" && ok_ "sony: rechaza un mariadbd fuera de chronos-sony" || { mal "sony no rechazó el mariadbd ajeno"; echo "$SAL" | tail -4; }
echo "chronos-sony chronos-sony-mariadb-1" >"$S/docker_ps"; echo "mariadbd 11" >"$S/procesos"
SAL=$(caddy sony --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -eq 0 ]] && ok_ "sony: admite el mariadbd de su propio chronos-sony" || { mal "sony rechazó su propio mariadb rc=$RC"; echo "$SAL" | tail -4; }
touch "$S/nginx_activo"; : >"$S/procesos"
SAL=$(caddy sony --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -ne 0 ]] && ok_ "rechaza con nginx activo" || mal "no rechazó con nginx activo"
echo "  -- candado: no se despliega durante un cambio de modo"
rm -f "$S/nginx_activo"; echo "chronos-sony chronos-sony-mariadb-1" >"$S/docker_ps"
( exec 8>"$CACHE_DIR/.modo.lock"; flock -n 8; sleep 3 ) & sleep 0.5
SAL=$(caddy sony --version-web 4.9.0-s --version-api 2.89.0-s --solo-comprobar); RC=$?
[[ $RC -ne 0 ]] && contiene "$SAL" "en curso" && ok_ "desplegar-caddy.sh respeta el mismo .modo.lock" || mal "no respetó el candado"
wait

echo "== 5. Guarda de lib.sh: el stack v1 solo en sony-nginx"
mkdir -p "$T/guarda"; printf '#!/usr/bin/env bash\nsource "%s/lib.sh"\necho PASO-LA-GUARDA\n' "$AQUI" >"$T/guarda/update-staging.sh"
cp "$T/guarda/update-staging.sh" "$T/guarda/03-provision-staging.sh"; cp "$T/guarda/update-staging.sh" "$T/guarda/replicate-prod.sh"
cp "$T/guarda/update-staging.sh" "$T/guarda/otro-script.sh"; chmod +x "$T/guarda"/*.sh
reiniciar; echo caddy-amz >"$MODO_FILE_REMOTE"
for sc in update-staging.sh 03-provision-staging.sh replicate-prod.sh; do
  SAL=$(bash "$T/guarda/$sc" 2>&1); RC=$?
  [[ $RC -ne 0 ]] && contiene "$SAL" "modo 'caddy-amz'" && ! contiene "$SAL" PASO-LA-GUARDA && ok_ "$sc se niega en caddy-amz" || mal "$sc no se negó en caddy-amz"
done
echo caddy-sony >"$MODO_FILE_REMOTE"
SAL=$(bash "$T/guarda/update-staging.sh" 2>&1); RC=$?
[[ $RC -ne 0 ]] && contiene "$SAL" "modo 'caddy-sony'" && ok_ "update-staging.sh se niega en caddy-sony" || mal "update-staging.sh no se negó en caddy-sony"
SAL=$(bash "$T/guarda/update-staging.sh" --status 2>&1); RC=$?
[[ $RC -eq 0 ]] && contiene "$SAL" PASO-LA-GUARDA && ok_ "--status pasa la guarda aun en caddy-sony" || mal "--status quedó bloqueado"
SAL=$(bash "$T/guarda/update-staging.sh" --help 2>&1); RC=$?
[[ $RC -eq 0 ]] && contiene "$SAL" PASO-LA-GUARDA && ok_ "--help pasa la guarda" || mal "--help quedó bloqueado"
SAL=$(bash "$T/guarda/otro-script.sh" 2>&1); RC=$?
[[ $RC -eq 0 ]] && contiene "$SAL" PASO-LA-GUARDA && ok_ "otros scripts no se ven afectados" || mal "la guarda afectó a otro script"
echo sony-nginx >"$MODO_FILE_REMOTE"
SAL=$(bash "$T/guarda/update-staging.sh" 2>&1); RC=$?
[[ $RC -eq 0 ]] && contiene "$SAL" PASO-LA-GUARDA && ok_ "sony-nginx: la guarda no hace nada" || mal "la guarda bloqueó sony-nginx"
rm -f "$MODO_FILE_REMOTE"
SAL=$(bash "$T/guarda/update-staging.sh" 2>&1); RC=$?
[[ $RC -eq 0 ]] && contiene "$SAL" PASO-LA-GUARDA && ok_ "sin archivo de modo (VM anterior a los modos): pasa" || mal "la guarda bloqueó una VM sin archivo de modo"
echo caddy-amz >"$MODO_FILE_REMOTE"
SAL=$(modos --estado); contiene "$SAL" "se niegan a correr" && ok_ "--estado menciona la guarda en un modo Caddy" || mal "--estado no menciona la guarda"

echo "== 6. desplegar.sh contra un 'servidor' local (ssh/rsync/curl con stubs)"
DEST="$T/dest"; DATOS="$T/datos-amz"
escribe_env() { # .env mínimo válido; DATOS_DIR y DOMINIOS con comillas a propósito
  mkdir -p "$DEST"; rm -f "$DEST/despliegues.log" "$S/pulls.log" "$S/curl.log"
  cat >"$DEST/.env" <<ENVEOF
DATOS_DIR="$DATOS"
IMAGEN_WEB="exogrid/chronos-web:0.0.0-s"
IMAGEN_API=exogrid/chronos-api:0.0.0-s
DOMINIOS="amz-prueba.ejemplo.com"
DNS_TOKEN=x
ACME_EMAIL=a@b.c
DB_DATABASE_NAME=db
DB_PASSWORD=p
DB_ROOT_PASSWORD=r
JWTSECRET=j
CONFIG_CLAVE=c
SMTP_FROM=f@b.c
CLIENTE=amz
ENTORNO=staging
ENVEOF
}
desplegar() { "$AQUI/../clientes/desplegar.sh" --host servidor-falso --dir "$DEST" --cliente amz --version-web 4.9.0-s --version-api 2.89.0-s "$@" 2>&1; }
rm -rf "$DATOS"; escribe_env
SAL=$(STUB_CERT_NO_CONFIABLE=1 desplegar --staging); RC=$?
[[ $RC -eq 0 ]] && ok_ "staging con certificado de la CA de pruebas: la prueba de humo pasa (curl -k)" || { mal "staging con certificado no confiable rc=$RC"; echo "$SAL" | tail -5; }
espera "resultado=ok en despliegues.log" grep -q 'resultado=ok' "$DEST/despliegues.log"
contiene "$SAL" "no es de confianza" && ok_ "avisa que el certificado no es de confianza (con el emisor)" || mal "sin aviso de certificado no confiable"
contiene "$SAL" "Pretend Pear" && ok_ "el aviso incluye el emisor" || mal "el aviso no incluye el emisor"
espera "las pruebas de humo usaron -k y --resolve a 127.0.0.1" grep -q -- "-k --resolve amz-prueba.ejemplo.com:443:127.0.0.1" "$S/curl.log"
espera "DATOS_DIR con comillas: se crearon las carpetas en la ruta sin comillas" test -d "$DATOS/db_data/mysql" -a -d "$DATOS/exogrid"
espera "el dominio con comillas se resolvió sin ellas" grep -q "https://amz-prueba.ejemplo.com/" "$S/curl.log"
espera "el pull vio las versiones nuevas por variables de entorno" grep -qx "IMAGEN_WEB=exogrid/chronos-web:4.9.0-s IMAGEN_API=exogrid/chronos-api:2.89.0-s" "$S/pulls.log"
espera "el .env quedó con las etiquetas nuevas" bash -c "grep -qx 'IMAGEN_WEB=exogrid/chronos-web:4.9.0-s' '$DEST/.env' && grep -qx 'IMAGEN_API=exogrid/chronos-api:2.89.0-s' '$DEST/.env'"
echo "  -- producción (sin --staging): certificado no confiable = fallo (verificación estricta)"
escribe_env
SAL=$(STUB_CERT_NO_CONFIABLE=1 desplegar); RC=$?
[[ $RC -ne 0 ]] && ok_ "producción rechaza el certificado no confiable (rc=$RC)" || mal "producción aceptó un certificado no confiable"
espera "resultado=fallo en la prueba de humo" grep -q 'resultado=fallo en la prueba de humo' "$DEST/despliegues.log"
espera "producción no usó -k" bash -c "! grep -q -- ' -k ' '$S/curl.log'"
echo "  -- si el pull falla, el .env no se toca"
escribe_env; cp "$DEST/.env" "$T/env.antes"
SAL=$(STUB_PULL_FALLA=1 desplegar --staging); RC=$?
[[ $RC -ne 0 ]] && ok_ "pull fallido: el despliegue se detiene" || mal "el pull fallido no detuvo el despliegue"
espera ".env intacto tras el pull fallido" cmp -s "$T/env.antes" "$DEST/.env"
echo "  -- versiones: solo X.Y.Z o X.Y.Z-s"
SAL=$("$AQUI/../clientes/desplegar.sh" --host h --dir "$DEST" --cliente amz --version-web 4.9.0-d --version-api 2.89.0-s --simular 2>&1); RC=$?
[[ $RC -ne 0 ]] && ok_ "rechaza la versión con sufijo -d" || mal "aceptó 4.9.0-d"
SAL=$("$AQUI/../clientes/desplegar.sh" --host h --dir "$DEST" --cliente amz --version-web 4.9.0 --version-api 2.89.0 --simular 2>&1); RC=$?
[[ $RC -eq 0 ]] && ok_ "acepta versiones sin sufijo (producción)" || mal "rechazó 4.9.0 sin sufijo"

echo
echo "Resultado: $PASARON pasaron, $FALLARON fallaron"
[[ $FALLARON -eq 0 ]]
