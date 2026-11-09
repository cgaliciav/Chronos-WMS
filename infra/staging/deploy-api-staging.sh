#!/usr/bin/env bash
# Despliega el código local de api/ en STAGING (no toca producción).
#   ./deploy-api-staging.sh            # build de api/ como almacen-backend:staging-<sha> y reinicia backend
#   ./deploy-api-staging.sh --rollback # regresa a la imagen de producción
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"
require_cmds rsync git ssh

R="$STAGING_DIR_REMOTE"
set_image() {
  vm_ssh "cd $R && sed -i 's|^BACKEND_IMAGE=.*|BACKEND_IMAGE=$1|' .env && docker-compose up -d backend"
  ok "backend usando $1"
}

if [[ "${1:-}" == "--rollback" ]]; then
  # shellcheck source=/dev/null
  source "$CACHE_DIR/manifest.env"
  set_image "$BACKEND_IMAGE"
  exit 0
fi

cd "$REPO_ROOT"
sha=$(git rev-parse --short HEAD)
git diff --quiet HEAD -- api || sha="$sha-dirty"
TAG="almacen-backend:staging-$sha"

step "Copiando api/ a la VM"
vm_rsync -a --delete --exclude node_modules --exclude .env --exclude .git --exclude 'deploy*.sh' --exclude deploy_history \
  "$REPO_ROOT/api/" "$R/api-src/"

step "Construyendo $TAG en la VM"
vm_ssh "cd $R/api-src && docker build -t $TAG ."
set_image "$TAG"

info "Esperando al backend…"
for _ in $(seq 1 120); do
  [[ "$(vm_ssh "curl -s -o /dev/null -w '%{http_code}' http://localhost:34400/" || true)" == "200" ]] && { ok "API arriba: http://$(vm_ip)/api/"; exit 0; }
  sleep 5
done
vm_ssh "docker logs --tail 80 teleset-almacen_backend_1" || true
die "El backend no respondió. Rollback: $0 --rollback"
