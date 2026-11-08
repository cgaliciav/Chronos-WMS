# Staging local (réplica de producción)

Crea una VM local con KVM/libvirt que replica `linode-prod` (`/home/cesargv/teleset-almacen`):
mismo SO, mismo runtime, misma imagen del backend, misma DB y mismos archivos. Producción **solo se lee**.

## Qué se replica

| | Producción | Staging |
|---|---|---|
| SO / HW | Ubuntu 24.04, 4 vCPU, 8 GB | Igual (VM libvirt `chronos-staging`) |
| Runtime | docker.io + docker-compose v1 (apt) + nginx en el host | Igual |
| DB | `mariadb:10.3`, `almacen_sony_migracion` (~24.5 GB) | Igual, restaurada de `mysqldump --single-transaction` |
| Backend | imagen `almacen-backend:<tag>` que corre en prod | La **misma imagen** (`docker save`/`load`) |
| Frontend | `nginx:1.25-alpine` + `front-www/` | Igual |
| Archivos | `exogrid/` (~13 GB) | Copia con rsync |
| Proxy | nginx host con SSL por dominio | nginx host, HTTP por IP |

Diferencias intencionales:
- **Secretos propios** (`~/teleset-almacen/.env` en la VM, generados allí): `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `JWTSECRET`. Sobrescriben los que están horneados en la imagen de prod.
- **Correo atrapado**: el backend de prod tiene Postmark hardcodeado (`src/helpers/enviarMail.ts`). En staging `smtp.postmarkapp.com` resuelve al contenedor **mailpit** (UI en `:8025`) y además iptables bloquea SMTP saliente (25/465/587/2525). Los datos son reales: nunca quites este bloqueo.
- MariaDB solo escucha en `127.0.0.1:3308` de la VM.

## Requisitos (laptop)
- `/dev/kvm`, `libvirt`, `virt-install`, `qemu-utils`; usuario en grupos `libvirt` y `kvm`.
- Acceso `ssh linode-prod`.
- ~80 GB libres en `/var/lib/libvirt/images` y ~40 GB en `~/staging-cache`.
- 8 GB de RAM libres para la VM (ajustable en `staging.conf`).

## Uso

```bash
cd infra/staging
cp staging.conf.example staging.conf   # opcional

./replicate-prod.sh                    # primera vez: VM + copia de prod + aprovisionamiento
```

Tiempos aproximados: VM 5-10 min · dump 30-90 min · rsync 13 GB según red · restore 1-2 h.
El dump genera mucha lectura en prod; si es horario laboral el script pide confirmación. Todo es reanudable:
si algo falla, vuelve a ejecutar el mismo comando.

Al terminar imprime las URLs: `http://<IP_VM>/`, `/api/`, mailpit en `:8025`.
Crea un snapshot limpio para revertir rápido tras pruebas destructivas:

```bash
virsh -c qemu:///system snapshot-create-as chronos-staging baseline
virsh -c qemu:///system snapshot-revert chronos-staging baseline
```

### Probar cambios

```bash
./deploy-api-staging.sh              # build de api/ local en la VM (almacen-backend:staging-<sha>)
./deploy-api-staging.sh --rollback   # vuelve a la imagen de producción
./deploy-front-staging.sh            # yarn build de front/ y lo publica en staging
./deploy-front-staging.sh --rollback
```

### Refrescar datos desde producción

```bash
./replicate-prod.sh --refresh-data   # nuevo dump + rsync incremental + restore (imagen vuelve a la de prod)
./03-provision-staging.sh --keep-image --force-restore   # re-restaurar sin cambiar la imagen del backend
```

## Scripts

| Script | Qué hace |
|---|---|
| `replicate-prod.sh` | Orquestador de las 3 fases (`--skip-vm`, `--refresh-data`, `--provision-only`, `-y`) |
| `01-create-vm.sh` | Descarga Ubuntu 24.04 cloud image, crea disco y VM con cloud-init (docker, compose, nginx) |
| `02-sync-from-prod.sh` | Dump de DB, rsync de `exogrid/` y `front-www/`, `docker save` de la imagen del backend → `~/staging-cache` |
| `03-provision-staging.sh` | Copia a la VM, genera secretos, restaura DB, configura nginx y bloqueo SMTP, levanta stack, smoke tests |
| `deploy-api-staging.sh` / `deploy-front-staging.sh` | Despliegan código local en staging |
| `staging-db.sh` | Helper instalado en la VM (`~/teleset-almacen/bin/staging-db`) para SQL como root sin exponer passwords |

## Troubleshooting
- **IP de la VM**: `virsh -c qemu:///system domifaddr chronos-staging` (se guarda en `~/staging-cache/vm-ip`).
- **SSH**: `ssh -i ~/.ssh/id_ed25519 -o UserKnownHostsFile=~/staging-cache/known_hosts cesargv@<IP>`.
- **Logs del backend**: `ssh … 'docker logs -f teleset-almacen_backend_1'`.
- **Logs de cada corrida**: `~/staging-cache/replicate-*.log`.
- **Recrear desde cero**: `virsh -c qemu:///system destroy chronos-staging; virsh -c qemu:///system undefine chronos-staging --remove-all-storage`, borrar `~/staging-cache/vm-ip` y volver a correr `replicate-prod.sh` (la caché de datos se reutiliza).
