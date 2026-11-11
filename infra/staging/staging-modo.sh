#!/usr/bin/env bash
# Alterna el modo de la VM de staging entre tres pilas que NO pueden convivir (comparten los puertos 80/443 y,
# Sony, el mismo directorio de datos de MariaDB):
#
#   sony-nginx  Stack actual de Sony: docker-compose v1 en ~/teleset-almacen + nginx en el host (como producción hoy).
#   caddy-amz   Cliente AMZ con Caddy en Docker (~/chronos-amz, compose v2, proyecto chronos-amz).
#   caddy-sony  Sony con Caddy en Docker (~/chronos-sony, proyecto chronos-sony). REUTILIZA los datos de Sony
#               (~/teleset-almacen/db_data/mysql): dos MariaDB sobre el mismo directorio lo corrompen.
#
# Uso:
#   ./staging-modo.sh sony-nginx | caddy-amz | caddy-sony   # cambia de modo
#   ./staging-modo.sh --estado                              # modo activo, contenedores, imágenes y certificado
#   ./staging-modo.sh --preparar                            # primera vez (idempotente); pide los tokens por consola
#   Opciones: --simular (imprime los comandos remotos sin tocar la VM), -y (sin confirmaciones).
#
# En los modos Caddy nginx queda deshabilitado (sobrevive a un reinicio de la VM); sony-nginx lo vuelve a habilitar.
# update-staging.sh, 03-provision-staging.sh y replicate-prod.sh se niegan a correr fuera de sony-nginx (guarda en lib.sh).
# Para cambiar de modo SIEMPRE se apaga todo (los tres stacks y nginx), se comprueba con `docker ps`, procesos y
# `ss -ltn` que nada queda en marcha y que 80/443 están libres, y solo entonces se enciende el destino. El modo se
# guarda en ~/staging-modo de la VM ("en-transicion" mientras dura el cambio, para que desplegar-caddy.sh se niegue).
# La primera vez que se entra a caddy-sony se toma un snapshot de la VM (pre-caddy-sony-<AAAAMMDD-HHMM>).
# Los secretos solo viajan por la entrada estándar de ssh; nunca por la línea de comandos ni a los logs.
# Los scripts remotos van entre comillas simples a propósito: se expanden en la VM.
# shellcheck disable=SC2016
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

uso() { sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2; }

ACCION="" ASSUME_YES=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    sony-nginx|caddy-amz|caddy-sony) ACCION="$1" ;;
    --estado) ACCION="estado" ;;
    --preparar) ACCION="preparar" ;;
    --simular) SIMULAR=1 ;;
    -y|--yes) ASSUME_YES=1 ;;
    -h|--help) uso; exit 0 ;;
    *) uso; die "argumento desconocido: $1" ;;
  esac
  shift
done
[[ -n "$ACCION" ]] || { uso; die "indica un modo, --estado o --preparar"; }
export ASSUME_YES SIMULAR

CLIENTES_DIR="$REPO_ROOT/infra/clientes"
[[ "$SIMULAR" == "1" ]] && warn "Modo --simular: no se toca la VM ni se crean snapshots."

if [[ "$SIMULAR" != "1" ]]; then
  vm_verifica_conexion
  mkdir -p "$CACHE_DIR"
  exec 9>"$CACHE_DIR/.modo.lock"
  flock -n 9 || die "Otro staging-modo.sh está en curso"
fi

# Copia a la VM (rsync); con --simular solo lo anuncia.
copiar() { # origen destino_remoto
  if [[ "$SIMULAR" == "1" ]]; then echo "[simular] rsync $1 -> $VM_USER@<vm>:$2" >&2; return 0; fi
  if [[ "${VM_SSH_LOCAL:-0}" == "1" ]]; then cp "$1" "$2"; return 0; fi
  vm_rsync -a "$1" "$2"
}

# ---------- --estado ----------
estado() {
  local modo dominio dir="" salida
  modo=$(modo_activo)
  step "Estado de staging ($VM_NAME)"
  info "Modo activo: ${C_BOLD}$modo${C_RESET}"
  if [[ "$modo" != sony-nginx && "$modo" != desconocido ]]; then
    info "update-staging.sh, 03-provision-staging.sh y replicate-prod.sh se niegan a correr en este modo (volver: ./staging-modo.sh sony-nginx)."
  fi
  if [[ "$SIMULAR" == "1" ]]; then
    echo "[simular] remoto: docker ps (nombre, imagen, estado) · systemctl is-active nginx · ss -ltn (80/443)" >&2
  else
    vm_bash "docker ps / nginx / puertos" '
echo "nginx del host: $(systemctl is-active nginx || true)"
echo "--- contenedores en marcha ---"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo "--- puertos 80/443 en escucha ---"
ss -H -ltn "( sport = :80 or sport = :443 )" || true
'
  fi
  case "$modo" in
    caddy-amz) dir="$AMZ_DIR_REMOTE" ;;
    caddy-sony) dir="$SONY_CADDY_DIR_REMOTE" ;;
  esac
  if [[ -z "$dir" ]]; then
    info "Sin certificado que revisar (modo $modo: HTTP por IP)."
    return 0
  fi
  if [[ "$SIMULAR" == "1" ]]; then
    echo "[simular] remoto: grep ^DOMINIOS= $dir/.env (primer dominio) · openssl s_client -connect <ip>:443 -servername <dominio>" >&2
    return 0
  fi
  dominio=$(vm_bash "leer DOMINIOS de $dir/.env" 'grep -E "^DOMINIOS=" "$1/.env" 2>/dev/null | tail -n1 | cut -d= -f2- | cut -d, -f1 | tr -d "[:space:]\"" || true' "$dir")
  if [[ -z "$dominio" ]]; then warn "No hay DOMINIOS en $dir/.env"; return 0; fi
  if [[ "${VM_SSH_LOCAL:-0}" == "1" ]]; then info "Certificado de $dominio: no se consulta en pruebas locales."; return 0; fi
  info "Certificado de $dominio (contra la IP de la VM):"
  salida=$(timeout 15 openssl s_client -connect "$(vm_ip):443" -servername "$dominio" </dev/null 2>/dev/null \
    | openssl x509 -noout -subject -issuer -enddate 2>/dev/null || true)
  if [[ -n "$salida" ]]; then awk '{ print "    " $0 }' <<<"$salida"; else warn "Sin respuesta TLS en $(vm_ip):443 (¿stack apagado o sin desplegar?)"; fi
}

# ---------- --preparar ----------
preparar() {
  local flags want_amz=1 want_sony=1 dh_hecho=0
  local amz_dominio="" amz_token="" sony_token="" acme_email="" dh_ns="exogrid" dh_token=""
  step "Preparar la VM para los modos Caddy (idempotente)"
  # leer VARIABLE "pregunta" [secreto]: con STAGING_PREPARAR_STDIN=1 (pruebas) lee de la entrada estándar sin preguntar.
  leer() {
    if [[ "${STAGING_PREPARAR_STDIN:-0}" == "1" ]]; then IFS= read -r "$1"; return 0; fi
    if [[ "${3:-}" == secreto ]]; then read -r -s -p "$2" "$1"; echo; else read -r -p "$2" "$1"; fi
  }

  # A. docker compose v2, carpetas y modo inicial. Devuelve qué .env y login faltan.
  flags=$(vm_bash "apt-get install docker-compose-v2 (si falta) · mkdir $AMZ_DIR_REMOTE $SONY_CADDY_DIR_REMOTE · modo inicial" "$REMOTO_FUNCS"'
set -euo pipefail
if ! docker compose version >/dev/null 2>&1; then
  echo "Instalando docker-compose-v2…" >&2
  sudo apt-get update -qq >&2
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-v2 >&2
fi
docker compose version >&2
mkdir -p "$1" "$2"
if [ ! -f "$3" ]; then
  if systemctl is-active --quiet nginx && stacks_en_marcha | grep -q "^teleset-almacen "; then
    echo sony-nginx > "$3"; echo "Modo inicial registrado: sony-nginx" >&2
  else
    echo "Aviso: no hay ~/staging-modo y el stack de Sony no está en marcha; usa staging-modo.sh <modo>" >&2
  fi
fi
amz=0; sony=0; dh=0
[ -f "$1/.env" ] && amz=1
[ -f "$2/.env" ] && sony=1
grep -qs "index.docker.io" "$HOME/.docker/config.json" && dh=1
echo "AMZ_ENV=$amz SONY_ENV=$sony DH_LOGIN=$dh"
' "$AMZ_DIR_REMOTE" "$SONY_CADDY_DIR_REMOTE" "$MODO_FILE_REMOTE")
  if [[ "$SIMULAR" == "1" ]]; then flags="AMZ_ENV=0 SONY_ENV=0 DH_LOGIN=0"; fi
  [[ "$flags" == *"AMZ_ENV=1"* ]] && want_amz=0
  [[ "$flags" == *"SONY_ENV=1"* ]] && want_sony=0
  [[ "$flags" == *"DH_LOGIN=1"* ]] && dh_hecho=1
  ((want_amz)) || info "AMZ: $AMZ_DIR_REMOTE/.env ya existe; no se toca."
  ((want_sony)) || info "Sony: $SONY_CADDY_DIR_REMOTE/.env ya existe; no se toca."
  ((dh_hecho)) && info "Docker Hub: la VM ya tiene sesión iniciada."

  # B. Compose y ejemplos de .env (sin secretos) a cada carpeta.
  copiar "$CLIENTES_DIR/compose.yml" "$AMZ_DIR_REMOTE/"
  copiar "$CLIENTES_DIR/compose.staging.yml" "$AMZ_DIR_REMOTE/"
  copiar "$CLIENTES_DIR/amz/.env.example" "$AMZ_DIR_REMOTE/.env.example"
  copiar "$CLIENTES_DIR/compose.yml" "$SONY_CADDY_DIR_REMOTE/"
  copiar "$CLIENTES_DIR/compose.staging.yml" "$SONY_CADDY_DIR_REMOTE/"
  copiar "$CLIENTES_DIR/sony/.env.caddy.example" "$SONY_CADDY_DIR_REMOTE/.env.caddy.example"

  # C. Datos que pide la persona (los secretos con read -s: no se muestran ni van a ningún log).
  if [[ "$SIMULAR" == "1" ]]; then
    echo "[simular] se pedirían por consola: subdominio de AMZ, token de Cloudflare (AMZ), token de Linode (Sony), ACME_EMAIL, DOCKERHUB_NS y token de Docker Hub" >&2
  else
    [[ -t 0 || "${STAGING_PREPARAR_STDIN:-0}" == "1" ]] || die "--preparar pide datos por consola: ejecútalo en una terminal interactiva"
    if ((want_amz)); then
      leer amz_dominio "Subdominio de staging de AMZ (DOMINIOS, p. ej. amz-staging.exogrid.xyz): "
      leer amz_token "Token de Cloudflare (Zone:DNS:Edit) para AMZ: " secreto
      [[ -n "$amz_dominio" && -n "$amz_token" ]] || die "El subdominio y el token de Cloudflare son obligatorios"
    fi
    if ((want_sony)); then
      leer sony_token "Token de Linode (Domains: Read/Write) para Sony (staging.telesetalmacen.com): " secreto
      [[ -n "$sony_token" ]] || die "El token de Linode es obligatorio"
    fi
    if ((want_amz || want_sony)); then
      leer acme_email "Correo ACME_EMAIL (avisos de Let's Encrypt): "
      [[ -n "$acme_email" ]] || die "ACME_EMAIL es obligatorio"
    fi
    if ((want_amz || want_sony || !dh_hecho)); then
      leer dh_ns "Espacio de nombres (y usuario) de Docker Hub [exogrid]: "
      dh_ns="${dh_ns:-exogrid}"
    fi
    if ((!dh_hecho)); then
      leer dh_token "Token de Docker Hub de solo lectura (usuario $dh_ns): " secreto
      [[ -n "$dh_token" ]] || die "El token de Docker Hub es obligatorio"
    fi
  fi

  # D. Generar los .env y entrar a Docker Hub. Los datos entran por stdin, en este orden fijo.
  printf '%s\n' "$amz_dominio" "$amz_token" "$sony_token" "$acme_email" "$dh_ns" "$dh_token" \
  | vm_bash "crear .env de AMZ/Sony con secretos aleatorios (openssl rand) · docker login -u <espacio de nombres> --password-stdin" '
set -euo pipefail
umask 077
amz="$1"; sony="$2"; v1="$3"; want_amz="$4"; want_sony="$5"; dh="$6"
IFS= read -r amz_dominio; IFS= read -r amz_token; IFS= read -r sony_token
IFS= read -r acme_email; IFS= read -r dh_ns; IFS= read -r dh_token

# poner CLAVE VALOR: reemplaza (o descomenta) CLAVE= en .env sin pasar el valor por la línea de comandos.
poner() {
  K="$1" V="$2" awk '"'"'BEGIN { k = ENVIRON["K"]; v = ENVIRON["V"]; h = 0 }
    !h && $0 ~ "^#?" k "=" { print k "=" v; h = 1; next }
    { print }
    END { if (!h) print k "=" v }'"'"' .env > .env.nuevo
  mv .env.nuevo .env
}
hex() { openssl rand -hex 16; }
b64() { openssl rand -base64 32; }
imagenes() {
  poner IMAGEN_WEB "$dh_ns/chronos-web:0.0.0-s"
  poner IMAGEN_API "$dh_ns/chronos-api:0.0.0-s"
}

if [ "$want_amz" = 1 ]; then
  cd "$amz"
  cp .env.example .env; chmod 600 .env
  poner DATOS_DIR "$amz"
  poner DB_PASSWORD "$(hex)"; poner DB_ROOT_PASSWORD "$(hex)"
  poner JWTSECRET "$(b64)"; poner CONFIG_CLAVE "$(b64)"
  poner DOMINIOS "$amz_dominio"; poner DNS_TOKEN "$amz_token"; poner ACME_EMAIL "$acme_email"
  # Primera emisión con la CA de pruebas de Let'"'"'s Encrypt (evita límites de uso); ver README para quitarla.
  poner ACME_CA "https://acme-staging-v02.api.letsencrypt.org/directory"
  imagenes
  echo "AMZ: $amz/.env creado (secretos aleatorios, ACME_CA de pruebas)." >&2
fi

if [ "$want_sony" = 1 ]; then
  [ -f "$v1/.env" ] || { echo "Error: falta $v1/.env (stack actual de Sony); no se pueden reutilizar sus credenciales" >&2; exit 1; }
  # Mismos datos => mismas credenciales de MariaDB y misma clave de la API que el stack v1.
  valor_v1() { grep -E "^$1=" "$v1/.env" | tail -n1 | cut -d= -f2-; }
  for c in DB_PASSWORD DB_ROOT_PASSWORD JWTSECRET; do
    [ -n "$(valor_v1 "$c")" ] || { echo "Error: $c no está en $v1/.env" >&2; exit 1; }
  done
  if [ -z "$(valor_v1 CONFIG_CLAVE)" ]; then
    # Como hace update-staging.sh: una sola CONFIG_CLAVE para los dos stacks de Sony.
    echo "CONFIG_CLAVE=$(b64)" >> "$v1/.env"
    echo "Sony: $v1/.env no tenía CONFIG_CLAVE; se generó una y se comparte con chronos-sony." >&2
  fi
  cd "$sony"
  cp .env.caddy.example .env; chmod 600 .env
  poner DATOS_DIR "$v1"
  for c in DB_PASSWORD DB_ROOT_PASSWORD JWTSECRET CONFIG_CLAVE; do poner "$c" "$(valor_v1 "$c")"; done
  poner DOMINIOS "staging.telesetalmacen.com"; poner DNS_TOKEN "$sony_token"; poner ACME_EMAIL "$acme_email"
  imagenes
  echo "Sony: $sony/.env creado (credenciales copiadas de $v1/.env, DATOS_DIR=$v1)." >&2
fi

if [ "$dh" = 0 ]; then
  printf "%s" "$dh_token" | docker login -u "$dh_ns" --password-stdin >&2
fi
' "$AMZ_DIR_REMOTE" "$SONY_CADDY_DIR_REMOTE" "$STAGING_DIR_REMOTE" "$want_amz" "$want_sony" "$dh_hecho"
  ok "Preparación terminada. Siguiente: ./staging-modo.sh --estado"
}

# ---------- Cambio de modo ----------
snapshot_primera_vez_caddy_sony() {
  local snap
  if [[ "$SIMULAR" != "1" ]]; then
    virshc snapshot-list "$VM_NAME" --name 2>/dev/null | grep -q '^pre-caddy-sony-' && { info "Ya existe un snapshot pre-caddy-sony-*; no se toma otro."; return 0; }
  fi
  snap="pre-caddy-sony-$(date +%Y%m%d-%H%M)"
  step "Primera entrada a caddy-sony: snapshot de la VM $snap (todo está apagado; la VM se pausa unos segundos)"
  if [[ "$SIMULAR" == "1" ]]; then
    echo "[simular] virsh -c $LIBVIRT_URI snapshot-create-as $VM_NAME $snap --description 'Antes de la primera entrada a caddy-sony'" >&2
    return 0
  fi
  virshc snapshot-create-as "$VM_NAME" "$snap" --description "Antes de la primera entrada a caddy-sony (datos de Sony compartidos)" >/dev/null
  ok "Snapshot $snap creado. Revertir: virsh -c $LIBVIRT_URI snapshot-revert $VM_NAME $snap"
}

cambiar_modo() {
  local destino="$1" actual dir="" etiqueta
  actual=$(modo_activo)
  info "Modo actual: $actual → destino: $destino"
  case "$destino" in
    caddy-amz) dir="$AMZ_DIR_REMOTE" ;;
    caddy-sony) dir="$SONY_CADDY_DIR_REMOTE" ;;
  esac
  if [[ "$actual" == "$destino" ]]; then
    confirm "Ya estás en $destino. ¿Reiniciar el stack igualmente?" || { info "Sin cambios."; return 0; }
  elif [[ "$destino" == "caddy-sony" ]]; then
    warn "caddy-sony usa los datos de Sony ($STAGING_DIR_REMOTE/db_data/mysql): nunca debe correr a la vez que sony-nginx."
  fi

  step "1/3 Apagar todo y verificar (nada en marcha, 80/443 libres)"
  vm_bash "echo en-transicion > $MODO_FILE_REMOTE · docker compose -p chronos-amz stop · docker compose -p chronos-sony stop · (cd $STAGING_DIR_REMOTE && docker-compose stop) · sudo systemctl stop|disable --now nginx · detener cualquier contenedor restante de los 3 stacks · verificar docker ps / procesos mariadbd / ss -ltn 80,443" "$REMOTO_FUNCS"'
set -euo pipefail
modo_file="$1"; v1="$2"; destino="$3"
echo en-transicion > "$modo_file"
if docker compose version >/dev/null 2>&1; then
  for p in chronos-amz chronos-sony; do docker compose -p "$p" stop >&2; done
elif [ "$destino" != sony-nginx ]; then
  echo "Error: falta docker compose v2 en la VM; ejecuta ./staging-modo.sh --preparar" >&2; exit 1
fi
[ -d "$v1" ] && (cd "$v1" && docker-compose stop >&2)
# En los modos Caddy nginx se DESHABILITA (si no, tras reiniciar la VM arrancaría y pelearía por 80/443 con Caddy).
if [ "$destino" = sony-nginx ]; then sudo systemctl stop nginx; else sudo systemctl disable --now nginx; fi
# `docker-compose stop` no siempre alcanza contenedores huérfanos del proyecto (p. ej. <hash>_teleset-almacen_frontend_1):
# se detiene explícitamente cualquier contenedor que siga en marcha de los tres stacks.
stacks_en_marcha | while read -r _ nombre; do docker stop "$nombre" >&2; done
# Verificación independiente de los comandos anteriores.
enmarcha=$(stacks_en_marcha)
if [ -n "$enmarcha" ]; then echo "Error: siguen en marcha: $(echo $enmarcha)" >&2; exit 1; fi
if pgrep -x mariadbd >/dev/null || pgrep -x mysqld >/dev/null; then
  echo "Error: hay un proceso de MariaDB/MySQL en marcha; no se continúa (riesgo de corromper datos compartidos)" >&2; exit 1
fi
if systemctl is-active --quiet nginx; then echo "Error: nginx sigue activo" >&2; exit 1; fi
ocupados=$(ss -H -ltn "( sport = :80 or sport = :443 )")
if [ -n "$ocupados" ]; then echo "Error: los puertos 80/443 no están libres:" >&2; echo "$ocupados" >&2; exit 1; fi
echo "Todo apagado; 80/443 libres." >&2
' "$MODO_FILE_REMOTE" "$STAGING_DIR_REMOTE" "$destino"

  if [[ "$destino" == "caddy-sony" ]]; then
    step "2/3 Snapshot de seguridad"
    snapshot_primera_vez_caddy_sony
  else
    step "2/3 Snapshot de seguridad: no aplica a $destino"
  fi

  step "3/3 Encender $destino"
  if [[ -n "$dir" ]]; then etiqueta="cd $dir && docker compose -f compose.yml -f compose.staging.yml up -d (solo si hubo un despliegue correcto)"
  else etiqueta="cd $STAGING_DIR_REMOTE && docker-compose up -d · sudo systemctl enable --now nginx"; fi
  vm_bash "$etiqueta · echo $destino > $MODO_FILE_REMOTE" '
set -euo pipefail
modo_file="$1"; destino="$2"; v1="$3"; dir="$4"
if [ "$destino" = sony-nginx ]; then
  (cd "$v1" && docker-compose up -d >&2)
  sudo systemctl enable --now nginx
else
  cd "$dir"
  [ -f .env ] || { echo "Error: falta $dir/.env; ejecuta ./staging-modo.sh --preparar" >&2; exit 1; }
  [ -f compose.yml ] && [ -f compose.staging.yml ] || { echo "Error: faltan los compose en $dir; ejecuta ./staging-modo.sh --preparar" >&2; exit 1; }
  if grep -qs "resultado=ok" despliegues.log; then
    docker compose -f compose.yml -f compose.staging.yml up -d >&2
  else
    echo "Aviso: $destino aún no tiene un despliegue correcto: no se enciende nada. Ejecuta ./desplegar-caddy.sh ${destino#caddy-} --version-web V --version-api V" >&2
  fi
fi
echo "$destino" > "$modo_file"
' "$MODO_FILE_REMOTE" "$destino" "$STAGING_DIR_REMOTE" "${dir:-/nada}"
  ok "Modo activo: $destino"
  [[ "$SIMULAR" == "1" ]] || estado
}

case "$ACCION" in
  estado) estado ;;
  preparar) preparar ;;
  *) cambiar_modo "$ACCION" ;;
esac
