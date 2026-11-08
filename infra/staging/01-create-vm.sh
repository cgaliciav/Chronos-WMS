#!/usr/bin/env bash
# Fase 1: crea (o arranca) la VM local de staging con libvirt/KVM.
# Mismas specs que producción: Ubuntu 24.04, 4 vCPU, 8 GB RAM.
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

require_cmds virsh virt-install curl sha256sum ssh
[[ -x "$QEMU_IMG" ]] || die "No se encontró $QEMU_IMG (sudo apt install qemu-utils)"
[[ -r "$VM_SSH_PUBKEY" ]] || die "No existe la llave pública $VM_SSH_PUBKEY (ajusta VM_SSH_PUBKEY en staging.conf)"
[[ -e /dev/kvm ]] || die "/dev/kvm no disponible: habilita la virtualización"
mkdir -p "$CACHE_DIR/images"

wait_for_ip() {
  step "Esperando IP de la VM"
  local ip=""
  for _ in $(seq 1 90); do
    ip=$(virshc domifaddr "$VM_NAME" --source lease 2>/dev/null | awk '/ipv4/ {split($4,a,"/"); print a[1]; exit}')
    [[ -z "$ip" ]] && ip=$(virshc domifaddr "$VM_NAME" --source agent 2>/dev/null | awk '/ipv4/ && $4 !~ /^127\./ {split($4,a,"/"); print a[1]; exit}')
    [[ -n "$ip" ]] && break
    sleep 5
  done
  [[ -n "$ip" ]] || die "La VM no obtuvo IP en 7.5 min"
  echo "$ip" > "$VM_IP_FILE"
  ok "IP de la VM: $ip"
}

wait_for_cloud_init() {
  step "Esperando SSH y cloud-init (instala docker, nginx…; puede tardar ~5-10 min)"
  for _ in $(seq 1 120); do
    vm_ssh true 2>/dev/null && break
    sleep 5
  done
  vm_ssh true || die "No hay SSH a la VM"
  vm_ssh 'cloud-init status --wait >/dev/null; cloud-init status --long | head -5' || warn "cloud-init reportó errores; revisa: vm_ssh sudo cat /var/log/cloud-init-output.log"
  vm_ssh 'test -f /var/lib/cloud/instance/staging-ready' || die "cloud-init no completó el aprovisionamiento"
  vm_ssh 'docker --version; docker-compose version --short; nginx -v 2>&1'
  ok "VM aprovisionada"
}

# ---------- VM existente: solo arrancar ----------
if virshc dominfo "$VM_NAME" >/dev/null 2>&1; then
  info "La VM '$VM_NAME' ya existe"
  if [[ "$(virshc domstate "$VM_NAME")" != "running" ]]; then
    virshc start "$VM_NAME"
  fi
  wait_for_ip
  wait_for_cloud_init
  exit 0
fi

# ---------- Recursos ----------
step "Verificando recursos del host"
free_gb=$(human_free_gb /var/lib/libvirt/images)
avail_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
info "Disco libre en /var/lib/libvirt/images: ${free_gb} GB · RAM disponible: ${avail_mb} MB"
(( free_gb > 70 )) || die "Se necesitan >70 GB libres (DB 32 GB + archivos 13 GB + imágenes)"
(( avail_mb > VM_RAM_MB )) || warn "RAM disponible (${avail_mb} MB) menor que la asignada a la VM (${VM_RAM_MB} MB)"

# ---------- Imagen base Ubuntu ----------
IMG_NAME="${UBUNTU_RELEASE}-server-cloudimg-amd64.img"
IMG_URL="https://cloud-images.ubuntu.com/${UBUNTU_RELEASE}/current/${IMG_NAME}"
IMG_LOCAL="$CACHE_DIR/images/$IMG_NAME"
BASE_VOL="${UBUNTU_RELEASE}-base.qcow2"
DISK_VOL="${VM_NAME}.qcow2"

step "Descargando imagen cloud de Ubuntu ($UBUNTU_RELEASE)"
curl -fsSL "https://cloud-images.ubuntu.com/${UBUNTU_RELEASE}/current/SHA256SUMS" -o "$CACHE_DIR/images/SHA256SUMS"
expected=$(awk -v f="*$IMG_NAME" '$2==f {print $1}' "$CACHE_DIR/images/SHA256SUMS")
[[ -n "$expected" ]] || die "No se encontró checksum para $IMG_NAME"
if [[ -f "$IMG_LOCAL" ]] && echo "$expected  $IMG_LOCAL" | sha256sum -c --status; then
  ok "Imagen en caché y verificada"
else
  curl -fL --progress-bar -o "$IMG_LOCAL" "$IMG_URL"
  echo "$expected  $IMG_LOCAL" | sha256sum -c --status || die "Checksum inválido para $IMG_LOCAL"
  ok "Imagen descargada y verificada"
fi

step "Preparando discos en el pool '$VM_POOL'"
if ! virshc vol-info --pool "$VM_POOL" "$BASE_VOL" >/dev/null 2>&1; then
  size=$(stat -c%s "$IMG_LOCAL")
  virshc vol-create-as "$VM_POOL" "$BASE_VOL" "$size" --format raw
  virshc vol-upload --pool "$VM_POOL" "$BASE_VOL" "$IMG_LOCAL"
  ok "Volumen base $BASE_VOL subido"
fi
virshc pool-refresh "$VM_POOL" >/dev/null
if virshc vol-info --pool "$VM_POOL" "$DISK_VOL" >/dev/null 2>&1; then
  die "Ya existe el volumen $DISK_VOL sin VM asociada. Bórralo con: virsh -c $LIBVIRT_URI vol-delete --pool $VM_POOL $DISK_VOL"
fi
virshc vol-create-as "$VM_POOL" "$DISK_VOL" "${VM_DISK_GB}G" --format qcow2 \
  --backing-vol "$BASE_VOL" --backing-vol-format qcow2
ok "Disco ${VM_DISK_GB} GB creado (overlay sobre $BASE_VOL)"

# ---------- cloud-init ----------
USER_DATA="$CACHE_DIR/user-data"
pubkey=$(<"$VM_SSH_PUBKEY")
sed -e "s|__VM_NAME__|$VM_NAME|g" -e "s|__VM_USER__|$VM_USER|g" -e "s|__SSH_PUBKEY__|$pubkey|g" \
  "$STAGING_DIR/cloud-init/user-data.tpl" > "$USER_DATA"

step "Creando VM '$VM_NAME' (${VM_VCPUS} vCPU, ${VM_RAM_MB} MB RAM)"
virt-install --connect "$LIBVIRT_URI" \
  --name "$VM_NAME" \
  --vcpus "$VM_VCPUS" --memory "$VM_RAM_MB" \
  --osinfo ubuntu24.04 \
  --disk "vol=$VM_POOL/$DISK_VOL,bus=virtio" \
  --network "network=$VM_NETWORK,model=virtio" \
  --channel unix,target.type=virtio,target.name=org.qemu.guest_agent.0 \
  --cloud-init "user-data=$USER_DATA" \
  --graphics none --console pty,target_type=serial \
  --import --noautoconsole
virshc autostart "$VM_NAME" >/dev/null
rm -f "$KNOWN_HOSTS"

wait_for_ip
wait_for_cloud_init

cat <<EOF

${C_GREEN}VM lista.${C_RESET} Para entrar por SSH puedes agregar a ~/.ssh/config:

  Host $VM_NAME
      HostName $(vm_ip)
      User $VM_USER
      IdentityFile $VM_SSH_KEY
      UserKnownHostsFile $KNOWN_HOSTS
EOF
