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

STAGING_DIR_REMOTE="/home/cesargv/teleset-almacen"
CACHE_DIR="$HOME/staging-cache"

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
