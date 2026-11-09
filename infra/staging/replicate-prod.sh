#!/usr/bin/env bash
# Replica producción (linode-prod) en una VM local de staging.
#
#   ./replicate-prod.sh                 # todo: crear VM + traer datos de prod + aprovisionar
#   ./replicate-prod.sh --skip-vm       # la VM ya existe: solo sincronizar y aprovisionar
#   ./replicate-prod.sh --refresh-data  # refrescar staging con datos actuales de prod
#                                       # (nuevo dump + rsync incremental + restore; imagen = prod)
#   ./replicate-prod.sh --provision-only  # reaprovisionar con lo que ya está en caché
#   -y | --yes                          # no preguntar confirmaciones
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

DO_VM=1; DO_SYNC=1; DO_PROVISION=1
for arg in "$@"; do
  case "$arg" in
    --skip-vm) DO_VM=0 ;;
    --refresh-data) DO_VM=0 ;;
    --provision-only) DO_VM=0; DO_SYNC=0 ;;
    -y|--yes) export ASSUME_YES=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) die "Opción desconocida: $arg (usa --help)" ;;
  esac
done

start=$(date +%s)
mkdir -p "$CACHE_DIR"
LOG="$CACHE_DIR/replicate-$(date +%Y%m%d-%H%M%S).log"
info "Log completo en $LOG"
exec > >(tee -a "$LOG") 2>&1

(( DO_VM ))        && { step "FASE 1/3 · VM local";              "$STAGING_DIR/01-create-vm.sh"; }
(( DO_SYNC ))      && { step "FASE 2/3 · Copia desde producción"; "$STAGING_DIR/02-sync-from-prod.sh"; }
(( DO_PROVISION )) && { step "FASE 3/3 · Aprovisionar staging";  "$STAGING_DIR/03-provision-staging.sh"; }

elapsed=$(( $(date +%s) - start ))
ok "Terminado en $((elapsed / 60)) min $((elapsed % 60)) s"
