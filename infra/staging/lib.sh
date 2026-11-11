#!/usr/bin/env bash
# Funciones comunes para los scripts de staging. Se carga con: source "$(dirname "$0")/lib.sh"
# shellcheck disable=SC2034,SC2029  # variables usadas por los scripts que cargan este archivo
set -Eeuo pipefail

STAGING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$STAGING_DIR/../.." && pwd)"

# ---------- Configuración ----------
# Valores por defecto; se sobrescriben con infra/staging/staging.conf (no versionado).
PROD_HOST="linode-prod"
PROD_DIR="/home/cesargv/teleset-almacen"
PROD_PROJECT="teleset-almacen"          # nombre del proyecto docker-compose en prod
DB_NAME="almacen_sony_migracion"
DB_USER="almacen_usr"

VM_NAME="chronos-staging"
VM_VCPUS=2
VM_RAM_MB=4096
VM_DISK_GB=150
VM_USER="cesargv"
VM_SSH_PUBKEY="$HOME/.ssh/id_ed25519.pub"
VM_POOL="default"
VM_NETWORK="default"
UBUNTU_RELEASE="noble"                   # 24.04, igual que prod
LIBVIRT_URI="qemu:///system"

STAGING_DIR_REMOTE="${STAGING_DIR_REMOTE:-/home/cesargv/teleset-almacen}"

# Modos de staging con Caddy en Docker (staging-modo.sh, desplegar-caddy.sh). Rutas en la VM.
AMZ_DIR_REMOTE="${AMZ_DIR_REMOTE:-/home/cesargv/chronos-amz}"          # .env, db_data/, exogrid/ y compose de AMZ
SONY_CADDY_DIR_REMOTE="${SONY_CADDY_DIR_REMOTE:-/home/cesargv/chronos-sony}"  # solo .env y compose; sus datos están en STAGING_DIR_REMOTE
MODO_FILE_REMOTE="${MODO_FILE_REMOTE:-/home/cesargv/staging-modo}"       # modo activo: sony-nginx | caddy-amz | caddy-sony | en-transicion
PROYECTO_SONY_V1="teleset-almacen"                  # proyecto docker-compose v1 del stack actual de Sony
MODOS_VALIDOS="sony-nginx caddy-amz caddy-sony"
CACHE_DIR="${CACHE_DIR:-$HOME/staging-cache}"

if [[ -f "$STAGING_DIR/staging.conf" ]]; then
  # shellcheck source=/dev/null
  source "$STAGING_DIR/staging.conf"
fi

VM_SSH_KEY="${VM_SSH_KEY:-${VM_SSH_PUBKEY%.pub}}"
VM_IP_FILE="$CACHE_DIR/vm-ip"
KNOWN_HOSTS="$CACHE_DIR/known_hosts"
QEMU_IMG="/usr/bin/qemu-img"

# ---------- Logging ----------
if [[ -t 1 ]]; then
  C_RESET=$'\e[0m'; C_BLUE=$'\e[34m'; C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'; C_RED=$'\e[31m'; C_BOLD=$'\e[1m'
else
  C_RESET=""; C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_BOLD=""
fi
_ts() { date '+%H:%M:%S'; }
step() { echo; echo "${C_BOLD}${C_BLUE}[$(_ts)] ==> $*${C_RESET}"; }
info() { echo "${C_BLUE}[$(_ts)]${C_RESET} $*"; }
ok()   { echo "${C_GREEN}[$(_ts)] ✔${C_RESET} $*"; }
warn() { echo "${C_YELLOW}[$(_ts)] ⚠ $*${C_RESET}" >&2; }
die()  { echo "${C_RED}[$(_ts)] ✖ $*${C_RESET}" >&2; exit 1; }
trap 'die "Falló en línea $LINENO: $BASH_COMMAND"' ERR

require_cmds() {
  local missing=()
  for c in "$@"; do command -v "$c" >/dev/null 2>&1 || missing+=("$c"); done
  ((${#missing[@]} == 0)) || die "Faltan comandos: ${missing[*]} (instala con apt)"
}

confirm() {
  local prompt="$1"
  [[ "${ASSUME_YES:-0}" == "1" ]] && return 0
  read -r -p "$prompt [s/N] " ans
  [[ "$ans" =~ ^[sSyY]$ ]]
}

human_free_gb() { df -BG --output=avail "$1" | tail -1 | tr -dc '0-9'; }

# ---------- Producción (SOLO LECTURA) ----------
prod_ssh() { ssh -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=30 "$PROD_HOST" "$@"; }

# ---------- VM ----------
vm_ip() {
  [[ -s "$VM_IP_FILE" ]] || die "No se conoce la IP de la VM ($VM_IP_FILE). Ejecuta 01-create-vm.sh"
  cat "$VM_IP_FILE"
}
_vm_ssh_opts() {
  echo "-o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=30 -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$KNOWN_HOSTS -i $VM_SSH_KEY"
}
vm_ssh() {
  # shellcheck disable=SC2046
  ssh $(_vm_ssh_opts) "$VM_USER@$(vm_ip)" "$@"
}
vm_rsync() {
  # uso: vm_rsync [opciones rsync] SRC DEST_REMOTA_SIN_HOST
  local args=("$@")
  local dest="${args[-1]}"; unset 'args[-1]'
  rsync -e "ssh $(_vm_ssh_opts)" "${args[@]}" "$VM_USER@$(vm_ip):$dest"
}
virshc() { virsh -c "$LIBVIRT_URI" "$@"; }

# ---------- Comprobaciones de staging ----------
# Front, API y mailpit responden; el host SMTP del backend resuelve a mailpit; iptables bloquea SMTP saliente.
# Devuelve 1 si alguna falla (cada fallo se reporta con warn).
smoke_tests() {
  local ip fail=0 code smtp_ip mailpit_ip
  ip=$(vm_ip)
  _check() { # nombre url esperado
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$2" || true)
    if [[ "$code" == "$3" ]]; then ok "$1 ($2) → $code"; else warn "$1 ($2) → $code (esperado $3)"; fail=1; fi
  }
  _check "Frontend" "http://$ip/" 200
  _check "API" "http://$ip/api/" 200
  _check "Mailpit UI" "http://$ip:8025/" 200
  smtp_ip=$(vm_ssh "docker exec teleset-almacen_backend_1 node -e \"require('dns').lookup('smtp.postmarkapp.com',(e,a)=>console.log(a||e))\"" || true)
  mailpit_ip=$(vm_ssh "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' teleset-almacen_mailpit_1" || true)
  if [[ -n "$smtp_ip" && "$smtp_ip" == "$mailpit_ip" ]]; then ok "smtp.postmarkapp.com → mailpit ($mailpit_ip)"
  else warn "smtp.postmarkapp.com resuelve a '$smtp_ip' (mailpit=$mailpit_ip)"; fail=1; fi
  if vm_ssh "sudo iptables -C DOCKER-USER -o \$(ip route show default | awk '{print \$5; exit}') -p tcp -m multiport --dports 25,465,587,2525 -j REJECT --reject-with tcp-reset"; then
    ok "SMTP saliente bloqueado (iptables DOCKER-USER)"
  else
    warn "Regla de bloqueo SMTP no encontrada"; fail=1
  fi
  return "$fail"
}

# ---------- Modos de staging (Caddy) ----------
# Con SIMULAR=1 no se toca la VM: vm_bash imprime lo que ejecutaría y modo_activo devuelve
# $STAGING_MODO_SIMULADO (por defecto sony-nginx).
SIMULAR="${SIMULAR:-0}"

# uso: vm_bash "etiqueta" 'script bash' [args...]
# Ejecuta el script en la VM como `bash -c` (los argumentos son $1, $2…). La entrada estándar queda libre para
# pasar secretos: nunca van en la línea de comandos. La etiqueta resume el comando para --simular.
vm_bash() {
  local etiqueta="$1" script="$2"; shift 2
  if [[ "$SIMULAR" == "1" ]]; then
    echo "[simular] remoto: $etiqueta" >&2
    [[ "${SIMULAR_VERBOSO:-0}" == "1" ]] && awk '{ print "[simular]     | " $0 }' <<<"$script" >&2
    return 0
  fi
  if [[ "${VM_SSH_LOCAL:-0}" == "1" ]]; then  # pruebas (probar-modos.sh): el "remoto" es esta máquina, con stubs en el PATH
    bash -c "$script" _ "$@"
    return
  fi
  local qargs=""
  (($#)) && qargs=$(printf '%q ' "$@")
  vm_ssh "bash -c $(printf '%q' "$script") _ $qargs"
}

# Modo activo según ~/staging-modo en la VM ("desconocido" si el archivo no existe).
modo_activo() {
  if [[ "$SIMULAR" == "1" ]]; then echo "${STAGING_MODO_SIMULADO:-sony-nginx}"; return 0; fi
  if [[ "${VM_SSH_LOCAL:-0}" == "1" ]]; then cat "$MODO_FILE_REMOTE" 2>/dev/null || echo desconocido; return 0; fi
  vm_ssh "cat $MODO_FILE_REMOTE 2>/dev/null || echo desconocido"
}

dir_de_cliente() { # amz|sony → directorio remoto del stack Caddy
  case "$1" in
    amz) echo "$AMZ_DIR_REMOTE" ;;
    sony) echo "$SONY_CADDY_DIR_REMOTE" ;;
    *) die "cliente desconocido: $1" ;;
  esac
}

# Función para los scripts remotos (se antepone al script): una línea "<proyecto> <contenedor>" por cada contenedor en
# marcha de cualquiera de los tres stacks (vacío = ninguno). Un solo `docker ps` con --format y filtro con grep: repetir
# `--filter label=…` se combina con Y y no devolvería nada. Sirve igual con compose v1 y v2 (etiqueta del proyecto).
REMOTO_FUNCS='stacks_en_marcha() { docker ps --format "{{.Label \"com.docker.compose.project\"}} {{.Names}}" | grep -E "^(teleset-almacen|chronos-amz|chronos-sony) " || true; }
'

# Verifica que hay conexión con la VM (en pruebas locales no aplica).
vm_verifica_conexion() {
  [[ "$SIMULAR" == "1" || "${VM_SSH_LOCAL:-0}" == "1" ]] && return 0
  vm_ssh true || die "No hay SSH a la VM ($(vm_ip)). ¿Está encendida? virsh -c $LIBVIRT_URI start $VM_NAME"
}

# ---------- Guarda: el stack v1 de Sony solo corre en el modo sony-nginx ----------
# update-staging.sh, 03-provision-staging.sh y replicate-prod.sh levantan el stack v1 (docker-compose v1 + nginx del host),
# que comparte 80/443 y el directorio de datos de MariaDB con los modos Caddy. Si la VM está en caddy-amz o caddy-sony
# arrancarían una segunda MariaDB sobre los datos de Sony. Se aborta salvo que el modo sea sony-nginx o ~/staging-modo
# no exista (VM anterior a los modos = sony-nginx). Se omite con --status/--help (solo leen), si aún no hay VM (no hay
# IP en caché: replicate-prod.sh la crea) o si la VM no responde (el script fallará solo al intentar usarla).
guarda_modo_sony_nginx() {
  case "$(basename "$0")" in
    update-staging.sh|03-provision-staging.sh|replicate-prod.sh) ;;
    *) return 0 ;;
  esac
  local a
  for a in "$@"; do
    case "$a" in --status|-h|--help) return 0 ;; esac
  done
  [[ "$SIMULAR" == "1" || "${VM_SSH_LOCAL:-0}" == "1" || -s "$VM_IP_FILE" ]] || return 0
  local modo
  if ! modo=$(modo_activo 2>/dev/null); then
    warn "No se pudo leer el modo de la VM (¿apagada?); no se comprueba."
    return 0
  fi
  case "$modo" in
    sony-nginx|desconocido) return 0 ;;
  esac
  die "La VM está en modo '$modo': este script levantaría el stack v1 de Sony (y una segunda MariaDB sobre sus datos). Vuelve con ./staging-modo.sh sony-nginx (--estado muestra el modo)."
}
guarda_modo_sony_nginx "$@"
