#cloud-config
# Plantilla procesada por 01-create-vm.sh (__VM_NAME__, __VM_USER__, __SSH_PUBKEY__).
# Replica el host de producción: Ubuntu 24.04 + docker.io + docker-compose v1 (apt) + nginx en el host.
hostname: __VM_NAME__
manage_etc_hosts: true
timezone: America/Mexico_City

users:
  - name: __VM_USER__
    groups: [sudo, adm]
    shell: /bin/bash
    sudo: "ALL=(ALL) NOPASSWD:ALL"
    lock_passwd: true
    ssh_authorized_keys:
      - __SSH_PUBKEY__

ssh_pwauth: false
disable_root: true

growpart:
  mode: auto
  devices: ["/"]
resize_rootfs: true

package_update: true
package_upgrade: true
packages:
  - docker.io
  - docker-compose
  - nginx
  - rsync
  - jq
  - curl
  - pv
  - qemu-guest-agent

runcmd:
  - usermod -aG docker __VM_USER__
  - systemctl enable --now docker qemu-guest-agent
  - rm -f /etc/nginx/sites-enabled/default
  - systemctl enable --now nginx
  - touch /var/lib/cloud/instance/staging-ready

final_message: "chronos-staging listo tras $UPTIME s"
