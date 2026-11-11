#!/usr/bin/env bash
# Funciones comunes para construir, publicar y promover las imágenes chronos-web y chronos-api.
# Se carga con: source "$(dirname "$0")/lib.sh"
# shellcheck disable=SC2034  # variables usadas por los scripts que cargan este archivo
set -Eeuo pipefail

IMAGENES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$IMAGENES_DIR/../.." && pwd)"

# ---------- Logging (mismo estilo que infra/staging/lib.sh) ----------
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
  ((${#missing[@]} == 0)) || die "Faltan comandos: ${missing[*]}"
}

# ---------- Configuración ----------
# infra/imagenes/imagenes.conf (no versionado) define DOCKERHUB_NS (obligatorio) y SENTRY_DSN_FRONT (opcional).
cargar_config() {
  if [[ -f "$IMAGENES_DIR/imagenes.conf" ]]; then
    # shellcheck source=/dev/null
    source "$IMAGENES_DIR/imagenes.conf"
  fi
  DOCKERHUB_NS="${DOCKERHUB_NS:-}"
  SENTRY_DSN_FRONT="${SENTRY_DSN_FRONT:-}"
  [[ -n "$DOCKERHUB_NS" ]] || die "Falta DOCKERHUB_NS: copia infra/imagenes/imagenes.conf.example a imagenes.conf y complétalo"
}

validar_app() {
  case "${1:-}" in
    web|api) ;;
    *) die "La app debe ser web o api (recibí: '${1:-}')" ;;
  esac
}

# Carpeta con el package.json que fija la versión de cada app.
carpeta_version() { if [[ "$1" == "web" ]]; then echo front; else echo api; fi; }

# Valida X.Y.Z (sin sufijo ni 'v').
validar_version() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Versión inválida '$1': el formato es X.Y.Z"
}

# De "X.Y.Z-d" saca "X.Y.Z"; cualquier otro formato (incluidos -s y sin sufijo) es un error.
version_sin_sufijo() {
  [[ "$1" =~ ^([0-9]+\.[0-9]+\.[0-9]+)-d$ ]] || die "La versión '$1' del package.json debe ser X.Y.Z-d (desarrollo)"
  echo "${BASH_REMATCH[1]}"
}

# Lee la versión de package.json en <ref> (git show), sin tocar el árbol de trabajo.
version_en_ref() { # <ref> <app>
  git -C "$REPO_ROOT" show "$1:$(carpeta_version "$2")/package.json" \
    | sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' | head -1
}

# Existe la referencia en el registro? Devuelve 0 si existe, 1 si no existe. Cualquier otro fallo (red, credenciales)
# aborta: confundirlo con "no existe" dejaría publicar encima de una etiqueta ya publicada.
etiqueta_existe() { # <imagen:etiqueta>
  local salida
  if salida="$(docker buildx imagetools inspect "$1" 2>&1)"; then return 0; fi
  if grep -qiE 'not found|no such manifest|manifest unknown|name unknown|does not exist|denied|requested access' <<<"$salida"; then
    return 1
  fi
  die "No pude consultar $1 en el registro: $(head -c 300 <<<"$salida")"
}

# Digest (sha256:...) de una referencia ya publicada.
digest_de() { # <imagen:etiqueta>
  docker buildx imagetools inspect "$1" --format '{{.Manifest.Digest}}'
}

exigir_no_publicada() { # <imagen:etiqueta>
  if etiqueta_existe "$1"; then die "$1 ya publicada; sube la versión"; fi
  ok "$1 no existe todavía en el registro"
}
