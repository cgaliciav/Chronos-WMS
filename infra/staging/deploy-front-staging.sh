#!/usr/bin/env bash
# Compatibilidad: despliega solo el front en STAGING con update-staging.sh (build en contenedor node:<.nvmrc>).
#   ./deploy-front-staging.sh             # = ./update-staging.sh --front-only
#   ./deploy-front-staging.sh --rollback  # = ./update-staging.sh --front-only --rollback (build de producción)
#   SKIP_BUILD=1 ./deploy-front-staging.sh  # publica el último build de la caché sin reconstruir
# Cualquier otra opción se pasa tal cual (--ref, -y…).
extra=()
[[ "${SKIP_BUILD:-0}" == "1" ]] && extra+=(--skip-front-build)
exec "$(dirname "$0")/update-staging.sh" --front-only "${extra[@]}" "$@"
