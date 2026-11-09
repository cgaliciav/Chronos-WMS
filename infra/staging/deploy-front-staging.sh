#!/usr/bin/env bash
# Despliega el frontend local (front/) en STAGING.
#   ./deploy-front-staging.sh            # yarn build y rsync a front-www de la VM
#   ./deploy-front-staging.sh --rollback # vuelve a poner el build de producción (caché local)
#   SKIP_BUILD=1 ./deploy-front-staging.sh  # usa front/build existente
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
require_cmds rsync ssh

R="$STAGING_DIR_REMOTE"
if [[ "${1:-}" == "--rollback" ]]; then
  vm_rsync -a --delete "$CACHE_DIR/front-www/" "$R/front-www/"
  ok "Frontend de producción restaurado en staging"
  exit 0
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  require_cmds yarn
  step "yarn build (front/, Node $(cat "$REPO_ROOT/front/.nvmrc"))"
  (cd "$REPO_ROOT/front" && NODE_OPTIONS=--max_old_space_size=4096 yarn build)
fi
[[ -f "$REPO_ROOT/front/build/index.html" ]] || die "No existe front/build/index.html"

step "Copiando build a la VM"
vm_rsync -a --delete "$REPO_ROOT/front/build/" "$R/front-www/"
ok "Frontend desplegado: http://$(vm_ip)/"
