#!/usr/bin/env bash
# Actualiza el servicio de STAGING (VM chronos-staging) con el código de este repositorio. No toca producción.
#
#   ./update-staging.sh                 # API + front desde el árbol de trabajo (incluye cambios sin confirmar)
#   ./update-staging.sh --ref main      # despliega un commit, rama o tag sin tocar el árbol de trabajo
#   ./update-staging.sh --api-only      # solo el API      (--front-only: solo el front)
#   ./update-staging.sh --no-migrate    # si hay migraciones pendientes se detiene en lugar de aplicarlas
#   ./update-staging.sh --status        # qué está desplegado, migraciones, últimos despliegues y snapshots
#   ./update-staging.sh --rollback      # vuelve a la versión de producción (imagen y front de la caché)
#
# Otras opciones: --no-snapshot (no crear snapshot antes de migrar), --snapshot (crearlo aunque no haya
# migraciones), --skip-front-build (publica el último build de la caché), -y | --yes (sin confirmaciones).
#
# Pasos del API: build de la imagen almacen-backend:staging-<sha> en la VM → migraciones pendientes
# (snapshot de la VM, backend detenido, node build/migrar.js run) → cambio de imagen → comprobaciones.
# El front se construye en un contenedor local node:<front/.nvmrc> con npm (o yarn si la ref aún trae yarn.lock).
# Documentación: infra/staging/README.md (sección «Actualizar staging»).
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

DO_API=1; DO_FRONT=1; MIGRATE=1; SNAPSHOT=auto; REF=""; MODE=deploy; SKIP_FRONT_BUILD=0
while (($#)); do
  case "$1" in
    --api-only) DO_FRONT=0 ;;
    --front-only) DO_API=0 ;;
    --ref) [[ -n "${2:-}" ]] || die "--ref necesita un commit, rama o tag"; REF="$2"; shift ;;
    --ref=*) REF="${1#--ref=}" ;;
    --no-migrate) MIGRATE=0 ;;
    --no-snapshot) SNAPSHOT=never ;;
    --snapshot) SNAPSHOT=always ;;
    --skip-front-build) SKIP_FRONT_BUILD=1 ;;
    --status) MODE=status ;;
    --rollback) MODE=rollback ;;
    -y|--yes) export ASSUME_YES=1 ;;
    -h|--help) sed -n '2,19p' "$0"; exit 0 ;;
    *) die "Opción desconocida: $1 (usa --help)" ;;
  esac
  shift
done
((DO_API || DO_FRONT)) || die "--api-only y --front-only se excluyen"

require_cmds ssh rsync git curl flock jq
R="$STAGING_DIR_REMOTE"
C_BACKEND="teleset-almacen_backend_1"
DEPLOY_LOG="$R/deploys.log"   # historial en la VM (TSV)
mkdir -p "$CACHE_DIR"

vm_ssh true || die "No hay SSH a la VM ($(vm_ip)). ¿Está encendida? virsh -c $LIBVIRT_URI start $VM_NAME"
compose() { vm_ssh "cd $R && docker-compose $*"; }
# docker-compose 1.29 (el de apt, igual que prod) falla al RECREAR un contenedor cuya imagen se construyó con
# BuildKit (KeyError: 'ContainerConfig'). Se quita el contenedor y se crea de nuevo en lugar de recrearlo.
backend_up() { compose rm -sf backend >/dev/null && compose up -d backend; }
env_get() { vm_ssh "grep -m1 '^$1=' $R/.env | cut -d= -f2-" || true; }
env_set() { vm_ssh "cd $R && if grep -q '^$1=' .env; then sed -i 's|^$1=.*|$1=$2|' .env; else echo '$1=$2' >> .env; fi"; }
# ---------- Versionado (CLAUDE.md raíz) ----------
# Formato vX.Y.Z; en staging la versión termina en -s. El repo guarda X.Y.Z (producción) o X.Y.Z-d (desarrollo):
# se toma la base X.Y.Z y se publica X.Y.Z-s reescribiendo package.json y package-lock.json SOLO en la copia que se
# construye (el árbol de trabajo no cambia). Cualquier otro formato detiene el despliegue.
version_staging() { # package.json → X.Y.Z-s
  local v base
  v=$(jq -r '.version // empty' "$1")
  base=${v%-[ds]}
  [[ "$base" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    || die "La versión '$v' de $1 no sigue X.Y.Z, X.Y.Z-d ni X.Y.Z-s (reglas de versionado del CLAUDE.md raíz)"
  echo "$base-s"
}
fijar_version() { # directorio versión → como npm version --no-git-tag-version, en la copia
  local f
  for f in "$1/package.json" "$1/package-lock.json"; do
    [[ -f "$f" ]] || continue
    jq --arg v "$2" '.version = $v | if .packages[""] then .packages[""].version = $v else . end' "$f" > "$f.tmp"
    mv "$f.tmp" "$f"
  done
}
api_version() { { vm_ssh "curl -s --max-time 5 http://localhost:34400/" 2>/dev/null || true; } | sed -n 's/.*"version":"\([^"]*\)".*/\1/p'; }
record() { # componente versión ref imagen migraciones snapshot
  local line; line="$(date '+%F %T')"$'\t'"$1"$'\t'"$2"$'\t'"$3"$'\t'"$4"$'\t'"$5"$'\t'"$6"$'\t'"$(id -un)"
  printf '%s\n' "$line" | vm_ssh "cat >> $DEPLOY_LOG"
}
wait_backend() { # espera a que GET / responda 200 (máx. ~5 min)
  local code=""
  for i in $(seq 1 60); do
    code=$(vm_ssh "curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:34400/" || true)
    [[ "$code" == "200" ]] && return 0
    (( i % 12 == 0 )) && info "…aún esperando al backend (código $code)"
    sleep 5
  done
  return 1
}

# ---------- --status ----------
if [[ "$MODE" == "status" ]]; then
  step "Staging en $(vm_ip)"
  img=$(env_get BACKEND_IMAGE)
  info "Imagen backend: $img (API responde v$(api_version || echo '?'))"
  info "Front: $(vm_ssh "cat $R/front.version 2>/dev/null" || echo 'build de producción (sin registro)')"
  if vm_ssh "docker run --rm --entrypoint test $img -f build/migrar.js" 2>/dev/null; then
    step "Migraciones (imagen $img)"
    compose run -T --rm --no-deps -e DB_SYNCRO=false backend node build/migrar.js show || warn "Hay migraciones pendientes"
  else
    info "La imagen en uso no trae build/migrar.js (versión anterior al plan 02 fase 4)"
  fi
  step "Últimos despliegues ($DEPLOY_LOG)"
  vm_ssh "tail -n 10 $DEPLOY_LOG 2>/dev/null | column -t -s \$'\\t'" || true
  step "Snapshots de la VM"
  virshc snapshot-list "$VM_NAME"
  exit 0
fi

# A partir de aquí se modifica staging: un despliegue a la vez y log de la corrida.
exec 9>"$CACHE_DIR/.update.lock"
flock -n 9 || die "Otro update-staging.sh está en curso"
LOG="$CACHE_DIR/update-$(date +%Y%m%d-%H%M%S).log"
info "Log completo en $LOG"
exec > >(tee -a "$LOG") 2>&1
# Mantener docker-compose.yml al día (variables nuevas del backend, alias de mailpit…).
vm_rsync -a "$STAGING_DIR/docker-compose.staging.yml" "$R/docker-compose.yml"

# ---------- --rollback: volver a producción ----------
if [[ "$MODE" == "rollback" ]]; then
  # shellcheck source=/dev/null
  source "$CACHE_DIR/manifest.env"
  if ((DO_API)); then
    step "API → imagen de producción $BACKEND_IMAGE"
    last_mig=$(vm_ssh "awk -F'\t' '\$2==\"migraciones\" {m=\$6; s=\$7} END {if (m) print m\" (snapshot \"s\")\"}' $DEPLOY_LOG 2>/dev/null" || true)
    if [[ -n "$last_mig" ]]; then
      warn "Staging aplicó migraciones: $last_mig. La imagen de producción funciona con DB_SYNCRO=false"
      warn "(las columnas nuevas tienen valor por defecto), pero el esquema NO vuelve atrás. Para el estado exacto:"
      warn "  virsh -c $LIBVIRT_URI snapshot-revert $VM_NAME <snapshot>"
      confirm "¿Volver a la imagen de producción conservando el esquema migrado?" || die "Cancelado"
    fi
    env_set BACKEND_IMAGE "$BACKEND_IMAGE"
    backend_up
    wait_backend || { vm_ssh "docker logs --tail 80 $C_BACKEND" || true; die "El backend no respondió"; }
    record api "v$(api_version)" prod "$BACKEND_IMAGE" - -   # versión de producción: sin sufijo
    ok "API de producción en staging"
  fi
  if ((DO_FRONT)); then
    step "Front → build de producción (caché)"
    vm_rsync -a --delete "$CACHE_DIR/front-www/" "$R/front-www/"
    vm_ssh "rm -f $R/front.version"
    record front prod prod - - -   # build de producción de la caché
    ok "Front de producción en staging"
  fi
  smoke_tests || warn "Smoke tests con fallos"
  exit 0
fi

# ---------- Código a desplegar ----------
cd "$REPO_ROOT"
SRC="$CACHE_DIR/src"          # copia de trabajo persistente (conserva front/node_modules entre builds)
mkdir -p "$SRC"
if [[ -n "$REF" ]]; then
  commit=$(git rev-parse --verify --quiet "$REF^{commit}") || die "No existe la referencia '$REF' (¿falta git fetch?)"
  sha=$(git rev-parse --short "$commit")
  LABEL="$REF@$sha"
  export_dir="$CACHE_DIR/src-export"; rm -rf "$export_dir"; mkdir -p "$export_dir"
  git archive "$commit" api front | tar -x -C "$export_dir"
  SRC_ROOT="$export_dir"
else
  sha=$(git rev-parse --short HEAD)
  paths=(); ((DO_API)) && paths+=(api); ((DO_FRONT)) && paths+=(front)
  dirty=$(git status --porcelain -- "${paths[@]}")
  [[ -n "$dirty" ]] && { sha="$sha-dirty"; warn "Hay cambios sin confirmar: se despliegan tal cual ($sha)"; }
  LABEL="$(git rev-parse --abbrev-ref HEAD)@$sha"
  SRC_ROOT="$REPO_ROOT"
fi
info "Desplegando $LABEL en staging ($(vm_ip))"

# ---------- API ----------
deploy_api() {
  local TAG="almacen-backend:staging-$sha" prev pending snap="-" migs="-" since version_src
  prev=$(env_get BACKEND_IMAGE)
  version_src=$(version_staging "$SRC_ROOT/api/package.json")

  step "API · copiando código a la VM (v$version_src)"
  mkdir -p "$SRC/api"
  rsync -a --delete --exclude node_modules --exclude build --exclude '.env*' --exclude .git \
    --exclude '*.sh' --exclude deploy_history "$SRC_ROOT/api/" "$SRC/api/"
  fijar_version "$SRC/api" "$version_src"
  vm_rsync -a --delete "$SRC/api/" "$R/api-src/"

  step "API · construyendo $TAG en la VM (v$version_src)"
  vm_ssh "cd $R/api-src && docker build -q -t $TAG ." >/dev/null
  ok "Imagen $TAG lista (imagen actual: $prev)"

  step "API · migraciones pendientes"
  local show rc=0
  show=$(vm_ssh "cd $R && BACKEND_IMAGE=$TAG docker-compose run -T --rm --no-deps -e DB_SYNCRO=false backend node build/migrar.js show" 2>&1) || rc=$?
  echo "$show"
  pending=$(grep -c '^\[ \]' <<<"$show" || true)
  ((rc == 0 || pending > 0)) || die "No se pudo consultar el estado de las migraciones (código $rc)"

  if ((pending > 0)); then
    ((MIGRATE)) || die "Hay $pending migración(es) pendiente(s) y se pidió --no-migrate. La imagen $prev sigue en uso."
    warn "Se aplicarán $pending migración(es) sobre la BD de staging (datos reales de producción)."
    confirm "¿Aplicar las migraciones en staging?" || die "Cancelado. La imagen $prev sigue en uso."
  fi
  if [[ "$SNAPSHOT" == "always" || ( "$SNAPSHOT" == "auto" && pending -gt 0 ) ]]; then
    snap="pre-update-$(date +%Y%m%d-%H%M)-${sha%-dirty}"
    step "Snapshot de la VM: $snap (la VM se pausa unos segundos)"
    virshc snapshot-create-as "$VM_NAME" "$snap" --description "Antes de desplegar $LABEL ($TAG) con update-staging.sh" >/dev/null
    ok "Snapshot $snap creado. Revertir: virsh -c $LIBVIRT_URI snapshot-revert $VM_NAME $snap"
    n=$(virshc snapshot-list "$VM_NAME" --name | grep -c '^pre-update-' || true)
    ((n > 3)) && warn "Hay $n snapshots pre-update-* ocupando disco; borra los viejos con: virsh -c $LIBVIRT_URI snapshot-delete $VM_NAME <nombre>"
  fi
  if ((pending > 0)); then
    step "API · aplicando migraciones (backend detenido)"
    compose stop backend
    local t0=$SECONDS
    if ! vm_ssh "cd $R && BACKEND_IMAGE=$TAG docker-compose run -T --rm --no-deps -e DB_SYNCRO=false backend node build/migrar.js run"; then
      warn "Las migraciones fallaron; la BD puede haber quedado a medias (MariaDB confirma cada DDL por separado)."
      [[ "$snap" != "-" ]] && warn "Revertir la VM: virsh -c $LIBVIRT_URI snapshot-revert $VM_NAME $snap"
      warn "O re-restaurar el dump de producción: ./03-provision-staging.sh --keep-image --force-restore"
      backend_up || true
      die "Migraciones fallidas; el backend volvió a la imagen $prev"
    fi
    vm_ssh "cd $R && BACKEND_IMAGE=$TAG docker-compose run -T --rm --no-deps -e DB_SYNCRO=false backend node build/migrar.js show" \
      || die "Siguen quedando migraciones pendientes tras 'run'"
    migs=$(grep '^\[ \]' <<<"$show" | awk '{print $3}' | paste -sd, -)
    ok "Migraciones aplicadas en $((SECONDS - t0)) s: $migs"
    record migraciones - "$LABEL" "$TAG" "$migs" "$snap"   # se anota ya: el esquema cambió aunque falle lo que sigue
  fi

  # La imagen corre como node (uid 1000): el volumen de archivos debe pertenecerle.
  if [[ -n "$(vm_ssh "find $R/exogrid ! -uid 1000 -print -quit")" ]]; then
    info "Ajustando dueño de exogrid/ a 1000:1000"
    vm_ssh "sudo chown -R 1000:1000 $R/exogrid"
  fi

  step "API · arrancando $TAG"
  since=$(vm_ssh "date -u +%Y-%m-%dT%H:%M:%SZ")
  [[ "$prev" != "$TAG" ]] && env_set BACKEND_IMAGE_PREV "$prev"
  env_set BACKEND_IMAGE "$TAG"
  backend_up
  if ! wait_backend; then
    vm_ssh "docker logs --tail 80 $C_BACKEND" || true
    die "El backend no respondió. Volver a la imagen anterior: ssh a la VM, BACKEND_IMAGE=$prev en $R/.env, docker-compose rm -sf backend && docker-compose up -d backend (o ./update-staging.sh --rollback)"
  fi
  local version; version=$(api_version)
  if [[ "$version" == "$version_src" ]]; then ok "API arriba: v$version"
  else warn "El API responde '$version' (se esperaba v$version_src)"; fi
  if vm_ssh "docker logs --since $since $C_BACKEND 2>&1 | grep -E 'migraciones pendientes|DB_SYNCRO=true'"; then
    warn "El backend reporta un problema de esquema (ver arriba)"
  fi
  record api "v$version" "$LABEL" "$TAG" "$migs" "$snap"

  # Limpieza: conservar solo la imagen en uso, la anterior y la de producción.
  local prod_img; prod_img=$(sed -n 's/^BACKEND_IMAGE=//p' "$CACHE_DIR/manifest.env")
  vm_ssh "docker images --format '{{.Repository}}:{{.Tag}}' 'almacen-backend:staging-*' | grep -vxF -e '$TAG' -e '$prev' -e '$prod_img' | xargs -r docker rmi >/dev/null; docker image prune -f >/dev/null" || true
}

# ---------- Front ----------
deploy_front() {
  local node_ver out="$SRC/front/build"
  node_ver=$(tr -d 'v \n' < "$SRC_ROOT/front/.nvmrc")
  if ((SKIP_FRONT_BUILD)); then
    [[ -f "$out/index.html" ]] || die "No hay build previo en $out"
    warn "Se publica el build existente de $out (--skip-front-build)"
  else
    require_cmds docker
    # Gestor de paquetes según el lockfile del código a desplegar: npm desde el plan 01 (Vite + React 19, Node 24);
    # yarn solo para refs anteriores (CRA, Node 10) que aún traen yarn.lock, para que --ref a commits viejos funcione.
    local pm cmd
    if [[ -f "$SRC_ROOT/front/package-lock.json" ]]; then
      pm=npm
      cmd='npm ci --no-audit --no-fund && npm run build'
    elif [[ -f "$SRC_ROOT/front/yarn.lock" ]]; then
      pm=yarn
      cmd='yarn install --frozen-lockfile --non-interactive --network-timeout 600000 && yarn build'
    else
      die "front/ no tiene package-lock.json ni yarn.lock"
    fi
    step "Front · build en contenedor node:$node_ver ($pm)"
    mkdir -p "$SRC/front" "$CACHE_DIR/npm-cache" "$CACHE_DIR/yarn-cache"
    # .env* fuera: el build usa solo las variables de abajo (los valores por defecto del código para lo demás).
    rsync -a --delete --exclude node_modules --exclude build --exclude '.env*' --exclude '*.tsbuildinfo' \
      "$SRC_ROOT/front/" "$SRC/front/"
    local fv_staging; fv_staging=$(version_staging "$SRC_ROOT/front/package.json")
    fijar_version "$SRC/front" "$fv_staging"
    info "Versión del front en staging: v$fv_staging"
    rm -rf "$out"
    docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp \
      -e npm_config_cache=/cache/npm -e YARN_CACHE_FOLDER=/cache/yarn \
      -e NODE_OPTIONS=--max_old_space_size=4096 -e CI=false \
      -e VITE_API_URL=/api/ -e REACT_APP_API_URL=/api/ \
      -v "$SRC/front:/app" -v "$CACHE_DIR/npm-cache:/cache/npm" -v "$CACHE_DIR/yarn-cache:/cache/yarn" \
      -w /app "node:$node_ver" sh -c "$cmd"
    [[ -f "$out/index.html" ]] || die "El build no generó $out/index.html"
  fi

  step "Front · publicando en la VM"
  vm_rsync -a --delete "$out/" "$R/front-www/"
  local fv; fv="v$(jq -r .version "$SRC/front/package.json")"   # la del build publicado (copia con sufijo -s)
  printf '%s %s %s\n' "$fv" "$LABEL" "$(date '+%F %T')" | vm_ssh "cat > $R/front.version"
  record front "$fv" "$LABEL" - - -
  ok "Front desplegado: http://$(vm_ip)/"
}

start=$SECONDS
((DO_API)) && deploy_api
((DO_FRONT)) && deploy_front

step "Comprobaciones finales"
if smoke_tests; then ok "Staging actualizado a $LABEL en $(( (SECONDS - start) / 60 )) min $(( (SECONDS - start) % 60 )) s"
else warn "Staging actualizado a $LABEL, pero hay comprobaciones con fallos (ver arriba)"; fi
cat <<EOF
  App:      http://$(vm_ip)/
  API:      http://$(vm_ip)/api/
  Correos:  http://$(vm_ip):8025/
  Estado:   $0 --status
EOF
