#!/usr/bin/env bash
# Fase 3: aprovisiona la VM de staging con lo traído de producción y levanta el stack.
# Opciones:
#   --force-restore  vuelve a restaurar la DB aunque el dump ya se haya restaurado
#   --keep-image     no regresa BACKEND_IMAGE a la imagen de prod (conserva un build de pruebas)
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

FORCE_RESTORE=0; KEEP_IMAGE=0
for arg in "$@"; do
  case "$arg" in
    --force-restore) FORCE_RESTORE=1 ;;
    --keep-image) KEEP_IMAGE=1 ;;
    *) die "Opción desconocida: $arg" ;;
  esac
done

require_cmds ssh rsync curl
MANIFEST="$CACHE_DIR/manifest.env"
[[ -f "$MANIFEST" ]] || die "No existe $MANIFEST. Ejecuta antes 02-sync-from-prod.sh"
# shellcheck source=/dev/null
source "$MANIFEST"
: "${BACKEND_IMAGE:?falta BACKEND_IMAGE en el manifest}" "${DUMP_FILE:?falta DUMP_FILE en el manifest}"
DUMP_PATH="$CACHE_DIR/db/$DUMP_FILE"
[[ -s "$DUMP_PATH" ]] || die "No existe el dump $DUMP_PATH"

IP=$(vm_ip)
R="$STAGING_DIR_REMOTE"
C_DB="teleset-almacen_mariadb_1"
C_BACKEND="teleset-almacen_backend_1"
vm_ssh true || die "No hay SSH a la VM ($IP). ¿Está encendida? virsh -c $LIBVIRT_URI start $VM_NAME"
ok "VM $VM_NAME en $IP · imagen prod $BACKEND_IMAGE · dump $DUMP_FILE"

# ---------- Archivos ----------
step "Copiando archivos a la VM ($R)"
vm_ssh "mkdir -p $R/exogrid $R/front-www $R/db_data $R/bin"
vm_rsync -a --chmod=F755 "$STAGING_DIR/staging-db.sh" "$R/bin/staging-db"
info "exogrid/ (13 GB la primera vez; espejo exacto de prod, borra lo que no exista en prod)"
vm_rsync -aH --delete --partial --info=progress2 "$CACHE_DIR/exogrid/" "$R/exogrid/"
info "front-www/"
vm_rsync -a --delete "$CACHE_DIR/front-www/" "$R/front-www/"
vm_rsync -a "$STAGING_DIR/docker-compose.staging.yml" "$R/docker-compose.yml"
vm_rsync -a "$STAGING_DIR/nginx-staging.conf" "$STAGING_DIR/block-smtp.sh" "/tmp/"
ok "Archivos copiados"

# ---------- Host: nginx + bloqueo SMTP ----------
step "Configurando nginx del host y bloqueo de SMTP saliente"
vm_ssh 'sudo bash -s' <<'EOF'
set -euo pipefail
install -m 644 /tmp/nginx-staging.conf /etc/nginx/sites-available/staging-telesetalmacen
ln -sfn /etc/nginx/sites-available/staging-telesetalmacen /etc/nginx/sites-enabled/staging-telesetalmacen
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
install -m 755 /tmp/block-smtp.sh /usr/local/sbin/staging-block-smtp
cat > /etc/systemd/system/staging-block-smtp.service <<'UNIT'
[Unit]
Description=Bloquea SMTP saliente en staging (evita correos a usuarios reales)
After=docker.service network-online.target
Wants=network-online.target
PartOf=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/sbin/staging-block-smtp

[Install]
WantedBy=multi-user.target docker.service
UNIT
systemctl daemon-reload
systemctl enable staging-block-smtp.service >/dev/null 2>&1
systemctl restart staging-block-smtp.service
EOF
ok "nginx y bloqueo SMTP listos"

# ---------- Imagen backend ----------
step "Cargando imagen $BACKEND_IMAGE en la VM"
if vm_ssh "docker image inspect $BACKEND_IMAGE >/dev/null 2>&1"; then
  ok "La imagen ya existe en la VM"
else
  vm_ssh 'gunzip | docker load' < "$CACHE_DIR/images/$BACKEND_IMAGE_FILE"
  ok "Imagen cargada"
fi

# ---------- Secretos de staging (.env, generados en la VM, nunca salen de ella) ----------
step "Secretos de staging"
vm_ssh "cd $R && bash -s" <<EOF
set -euo pipefail
if [ ! -f .env ]; then
  if [ -d db_data/mysql/mysql ]; then
    echo "Existe db_data/mysql pero no .env: no se conoce el password root. Borra db_data con 'sudo rm -rf $R/db_data/mysql' o restaura .env" >&2
    exit 1
  fi
  umask 077
  {
    echo "DB_ROOT_PASSWORD=\$(openssl rand -hex 24)"
    echo "DB_PASSWORD=\$(openssl rand -hex 24)"
    echo "JWTSECRET=\$(openssl rand -hex 32)"
    echo "BACKEND_IMAGE=$BACKEND_IMAGE"
  } > .env
  echo "Generado $R/.env (chmod 600)"
fi
if [ "$KEEP_IMAGE" = "0" ]; then
  sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=$BACKEND_IMAGE|" .env
fi
echo "BACKEND_IMAGE en uso: \$(grep ^BACKEND_IMAGE= .env | cut -d= -f2)"
EOF

compose() { vm_ssh "cd $R && docker-compose $*"; }
wait_db_healthy() {
  for _ in $(seq 1 60); do
    [[ "$(vm_ssh "docker inspect -f '{{.State.Health.Status}}' $C_DB 2>/dev/null")" == "healthy" ]] && return 0
    sleep 5
  done
  die "MariaDB no llegó a healthy"
}
db() { vm_ssh "$R/bin/staging-db $*"; }  # helper en la VM; el password no sale de ella

# ---------- DB ----------
step "Base de datos"
compose up -d mariadb mailpit
wait_db_healthy
ok "MariaDB healthy"

restored=$(vm_ssh "cat $R/.restored 2>/dev/null || true")
if [[ "$restored" == "$DUMP_SHA" && "$FORCE_RESTORE" == "0" ]]; then
  ok "El dump $DUMP_FILE ya está restaurado (usa --force-restore para repetir)"
else
  info "Restaurando $DUMP_FILE ($(du -h "$DUMP_PATH" | cut -f1) comprimido). Estimado: 1-2 h"
  compose stop backend >/dev/null 2>&1 || true
  vm_ssh "rm -f $R/.restored"
  # flush_log=2 acelera mucho la carga; se regresa a 1 (valor de prod) al terminar.
  db sql <<EOF
DROP DATABASE IF EXISTS \`$DB_NAME\`;
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
EOF
  size=$(stat -L -c%s "$DUMP_PATH")
  db restore "$size" < "$DUMP_PATH"
  echo "SET GLOBAL innodb_flush_log_at_trx_commit = 1;" | db sql
  # Usuario de la app con el password de staging y los mismos grants que en prod.
  db app-user < /dev/null
  vm_ssh "echo $DUMP_SHA > $R/.restored"
  ok "Base de datos restaurada"
fi

step "Verificando conteos contra producción (al momento del dump)"
mismatch=0
for pair in ${CHECK_COUNTS:-}; do
  t=${pair%%=*}; expected=${pair#*=}
  got=$(db count "$t" < /dev/null)
  if [[ "$got" == "$expected" ]]; then ok "$t: $got"; else warn "$t: staging=$got prod=$expected"; mismatch=1; fi
done
(( mismatch == 0 )) || warn "Hay diferencias de conteo (pueden deberse a escrituras en prod durante el dump)"

# ---------- Stack completo ----------
step "Levantando stack completo"
compose up -d
info "Esperando al backend (ts-node + TypeORM synchronize pueden tardar varios minutos)"
for i in $(seq 1 120); do
  code=$(vm_ssh "curl -s -o /dev/null -w '%{http_code}' http://localhost:34400/" || true)
  [[ "$code" == "200" ]] && break
  (( i % 12 == 0 )) && info "…aún esperando (código $code)"
  sleep 5
done
[[ "$code" == "200" ]] || { vm_ssh "docker logs --tail 50 $C_BACKEND" || true; die "El backend no respondió 200 en 10 min"; }
ok "Backend arriba"

# ---------- Smoke tests ----------
step "Smoke tests"
fail=0
check() { # nombre url esperado
  local code; code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$2" || true)
  if [[ "$code" == "$3" ]]; then ok "$1 ($2) → $code"; else warn "$1 ($2) → $code (esperado $3)"; fail=1; fi
}
check "Frontend" "http://$IP/" 200
check "API" "http://$IP/api/" 200
check "Mailpit UI" "http://$IP:8025/" 200
smtp_ip=$(vm_ssh "docker exec $C_BACKEND node -e \"require('dns').lookup('smtp.postmarkapp.com',(e,a)=>console.log(a||e))\"")
mailpit_ip=$(vm_ssh "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' teleset-almacen_mailpit_1")
if [[ "$smtp_ip" == "$mailpit_ip" ]]; then ok "smtp.postmarkapp.com → mailpit ($mailpit_ip)"; else warn "smtp.postmarkapp.com resuelve a $smtp_ip (mailpit=$mailpit_ip)"; fail=1; fi
if vm_ssh "sudo iptables -C DOCKER-USER -o \$(ip route show default | awk '{print \$5; exit}') -p tcp -m multiport --dports 25,465,587,2525 -j REJECT --reject-with tcp-reset"; then
  ok "SMTP saliente bloqueado (iptables DOCKER-USER)"
else
  warn "Regla de bloqueo SMTP no encontrada"; fail=1
fi
compose ps

cat <<EOF

${C_BOLD}${C_GREEN}Staging listo$( ((fail)) && echo " (con advertencias)" ).${C_RESET}
  App:            http://$IP/
  API:            http://$IP/api/
  Correos (mailpit): http://$IP:8025/
  MariaDB:        ssh -L 3308:127.0.0.1:3308 $VM_USER@$IP   (luego mysql -h127.0.0.1 -P3308)
  Imagen backend: $(vm_ssh "grep ^BACKEND_IMAGE= $R/.env | cut -d= -f2")
  Datos de prod:  dump $DUMP_FILE

Sugerencia: crea un snapshot limpio para revertir tras pruebas destructivas:
  virsh -c $LIBVIRT_URI snapshot-create-as $VM_NAME baseline-$(date +%Y%m%d)
EOF
