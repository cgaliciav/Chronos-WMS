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
VM_VCPUS=4
VM_RAM_MB=8192
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
