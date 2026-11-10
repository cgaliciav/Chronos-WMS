#!/usr/bin/env bash
# Fase 2: copia de producción a la caché local ($CACHE_DIR). SOLO LECTURA sobre producción.
#   - dump de la DB (mysqldump --single-transaction, en streaming; no ocupa disco en prod)
#   - exogrid/ (13 GB, rsync incremental y reanudable)
#   - front-www/ (build estático del frontend)
#   - imagen docker exacta del backend que corre en prod (docker save)
# Opciones: --skip-db  --skip-files  --skip-front  --skip-image
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

SKIP_DB=0; SKIP_FILES=0; SKIP_FRONT=0; SKIP_IMAGE=0
for arg in "$@"; do
  case "$arg" in
    --skip-db) SKIP_DB=1 ;;
    --skip-files) SKIP_FILES=1 ;;
    --skip-front) SKIP_FRONT=1 ;;
    --skip-image) SKIP_IMAGE=1 ;;
    *) die "Opción desconocida: $arg" ;;
  esac
done

require_cmds ssh rsync gzip sha256sum
mkdir -p "$CACHE_DIR"/{db,images,prod-config}
MANIFEST="$CACHE_DIR/manifest.env"
# Tablas pequeñas y estables usadas para verificar la restauración.
CHECK_TABLES="usuario bodega proyecto rol area proveedor"

step "Verificando acceso a producción ($PROD_HOST)"
prod_ssh true || die "No hay acceso SSH a $PROD_HOST"
container() {
  prod_ssh "docker ps --filter label=com.docker.compose.project=$PROD_PROJECT --filter label=com.docker.compose.service=$1 --format '{{.Names}}' | head -1"
}
C_BACKEND=$(container backend); C_DB=$(container mariadb)
[[ -n "$C_BACKEND" && -n "$C_DB" ]] || die "No se encontraron los contenedores backend/mariadb del proyecto $PROD_PROJECT"
BACKEND_IMAGE=$(prod_ssh "docker inspect --format '{{.Config.Image}}' $C_BACKEND")
ok "backend=$C_BACKEND ($BACKEND_IMAGE) · db=$C_DB"

free_gb=$(human_free_gb "$CACHE_DIR")
info "Espacio libre en $CACHE_DIR: ${free_gb} GB"
(( free_gb > 30 )) || die "Se necesitan >30 GB libres en $CACHE_DIR"

prod_ssh "cat $PROD_DIR/docker-compose.yml" > "$CACHE_DIR/prod-config/docker-compose.yml"

# Ejecuta SQL en prod como almacen_usr sin exponer la contraseña (se toma del contenedor backend).
PROD_MYSQL_PREFIX="P=\$(docker exec $C_BACKEND printenv DB_PASSWORD); docker exec -i -e MYSQL_PWD=\"\$P\" $C_DB"

# ---------- DB ----------
if (( SKIP_DB == 0 )); then
  step "Dump de la base de datos $DB_NAME (~24.5 GB sin comprimir)"
  hour=$(date +%H)
  if (( 10#$hour >= 8 && 10#$hour < 20 )); then
    warn "Estás en horario laboral: el dump genera mucha lectura de disco en prod (no bloquea tablas)."
    confirm "¿Continuar con el dump ahora?" || die "Cancelado. Usa --skip-db para sincronizar solo lo demás."
  fi

  counts=""
  for t in $CHECK_TABLES; do
    n=$(prod_ssh "$PROD_MYSQL_PREFIX mysql -u$DB_USER -N -e 'SELECT COUNT(*) FROM \`$t\`' $DB_NAME")
    counts+="$t=$n "
  done

  stamp=$(date +%Y%m%d-%H%M)
  dump="$CACHE_DIR/db/${DB_NAME}_${stamp}.sql.gz"
  info "Destino: $dump (esto puede tardar 30-90 min)"
  # shellcheck disable=SC2016
  prod_ssh "$PROD_MYSQL_PREFIX mysqldump -u$DB_USER --single-transaction --quick --routines --triggers --events --hex-blob --max-allowed-packet=512M --databases $DB_NAME | gzip -1" \
    | if command -v pv >/dev/null; then pv -btr; else cat; fi > "$dump.part"
  # Verifica que el dump terminó correctamente (mysqldump escribe "Dump completed" al final).
  gzip -t "$dump.part" || die "El dump está corrupto"
  zcat "$dump.part" | tail -c 200 | grep -q "Dump completed" || die "El dump está incompleto (no termina con 'Dump completed')"
  mv "$dump.part" "$dump"
  ln -sfn "$(basename "$dump")" "$CACHE_DIR/db/latest.sql.gz"
  dump_sha=$(sha256sum "$dump" | cut -c1-16)
  # Conserva solo los 2 dumps más recientes.
  find "$CACHE_DIR/db" -maxdepth 1 -name "${DB_NAME}_*.sql.gz" -printf '%T@ %p\n' | sort -rn | tail -n +3 | cut -d' ' -f2- | xargs -r rm -f
  ok "Dump listo: $(du -h "$dump" | cut -f1) · checksum $dump_sha"
  {
    echo "DUMP_FILE=$(basename "$dump")"
    echo "DUMP_SHA=$dump_sha"
    echo "DUMP_DATE=$stamp"
    echo "CHECK_COUNTS=\"$counts\""
  } > "$CACHE_DIR/db/manifest-db.env"
fi

# ---------- Archivos ----------
if (( SKIP_FILES == 0 )); then
  step "Sincronizando exogrid/ (13 GB la primera vez; luego incremental)"
  rsync -aH --partial --info=progress2 -e "ssh -o BatchMode=yes" \
    "$PROD_HOST:$PROD_DIR/exogrid/" "$CACHE_DIR/exogrid/"
  ok "exogrid sincronizado ($(du -sh "$CACHE_DIR/exogrid" | cut -f1))"
fi

# ---------- Frontend ----------
if (( SKIP_FRONT == 0 )); then
  step "Sincronizando front-www/"
  rsync -a --delete -e "ssh -o BatchMode=yes" "$PROD_HOST:$PROD_DIR/front-www/" "$CACHE_DIR/front-www/"
  ok "front-www sincronizado"
fi

# ---------- Imagen backend ----------
if (( SKIP_IMAGE == 0 )); then
  img_file="$CACHE_DIR/images/$(echo "$BACKEND_IMAGE" | tr '/:' '__').tar.gz"
  if [[ -s "$img_file" ]]; then
    ok "Imagen $BACKEND_IMAGE ya está en caché"
  else
    step "Exportando imagen $BACKEND_IMAGE (~490 MB)"
    prod_ssh "docker save $BACKEND_IMAGE | gzip -1" > "$img_file.part"
    gzip -t "$img_file.part" || die "Imagen exportada corrupta"
    mv "$img_file.part" "$img_file"
    ok "Imagen guardada en $img_file"
  fi
  {
    echo "BACKEND_IMAGE=$BACKEND_IMAGE"
    echo "BACKEND_IMAGE_FILE=$(basename "$img_file")"
  } > "$CACHE_DIR/images/manifest-image.env"
fi

cat "$CACHE_DIR"/db/manifest-db.env "$CACHE_DIR"/images/manifest-image.env 2>/dev/null > "$MANIFEST" || true
echo "SYNC_DATE=$(date -Iseconds)" >> "$MANIFEST"
step "Sincronización completa"
cat "$MANIFEST"
