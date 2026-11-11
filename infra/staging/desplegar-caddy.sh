#!/usr/bin/env bash
# Despliega un cliente con Caddy en la VM de staging: envuelve infra/clientes/desplegar.sh (--staging).
#
# Uso:
#   ./desplegar-caddy.sh amz|sony --version-web V --version-api V
#                        [--sembrar-admin <correo> --admin-nombre <nombre>] [--permitir-migrar] [--simular | --solo-comprobar]
#
# Se NIEGA a desplegar si el modo activo de la VM (~/staging-modo) no es el del cliente (caddy-amz / caddy-sony):
# lo cambia ./staging-modo.sh. Además comprueba con `docker ps` que no corre nada de los otros stacks ni nginx
# (Sony con Caddy comparte el directorio de datos de MariaDB con el stack v1: dos servidores lo corrompen).
# Con --permitir-migrar toma antes el snapshot pre-update-<AAAAMMDD-HHMM>-caddy-<cliente> de la VM (virsh, desde
# el host, como update-staging.sh); desplegar.sh lo ejecuta justo antes de aplicar migraciones.
# Versiones con sufijo de staging, p. ej. 4.9.0-s.
# shellcheck disable=SC2016
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

uso() { sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2; }

CLIENTE="${1:-}"
case "$CLIENTE" in
  amz|sony) shift ;;
  -h|--help) uso; exit 0 ;;
  *) uso; die "el primer argumento debe ser amz o sony" ;;
esac

V_WEB="" V_API="" CORREO="" NOMBRE="" PERMITIR=0 SOLO_COMPROBAR=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version-web) V_WEB="${2:?falta valor de --version-web}"; shift 2 ;;
    --version-api) V_API="${2:?falta valor de --version-api}"; shift 2 ;;
    --sembrar-admin) CORREO="${2:?falta valor de --sembrar-admin}"; shift 2 ;;
    --admin-nombre) NOMBRE="${2:?falta valor de --admin-nombre}"; shift 2 ;;
    --permitir-migrar) PERMITIR=1; shift ;;
    --simular) SIMULAR=1; shift ;;
    --solo-comprobar) SOLO_COMPROBAR=1; shift ;;
    -h|--help) uso; exit 0 ;;
    *) uso; die "argumento desconocido: $1" ;;
  esac
done
[[ -n "$V_WEB" && -n "$V_API" ]] || { uso; die "faltan --version-web y --version-api"; }

MODO_ESPERADO="caddy-$CLIENTE"
DIR_REMOTO=$(dir_de_cliente "$CLIENTE")
export SIMULAR
[[ "$SIMULAR" == "1" ]] && warn "Modo --simular: no se toca la VM; el modo activo se toma de STAGING_MODO_SIMULADO (${STAGING_MODO_SIMULADO:-sony-nginx})."

# 1. El modo activo debe ser el del cliente.
vm_verifica_conexion
if [[ "$SIMULAR" != "1" ]]; then
  # Mismo candado que staging-modo.sh: no se cambia de modo a mitad de un despliegue.
  mkdir -p "$CACHE_DIR"
  exec 9>"$CACHE_DIR/.modo.lock"
  flock -n 9 || die "Hay un staging-modo.sh o un despliegue en curso"
fi
MODO=$(modo_activo)
if [[ "$MODO" != "$MODO_ESPERADO" ]]; then
  die "El modo activo de staging es '$MODO' y para desplegar $CLIENTE debe ser '$MODO_ESPERADO'. Cámbialo con: infra/staging/staging-modo.sh $MODO_ESPERADO"
fi
ok "Modo activo: $MODO"

# 2. Doble comprobación independiente del archivo de modo: nada de los otros stacks en marcha.
vm_bash "docker ps: no debe haber contenedores de otros stacks ni procesos MariaDB ajenos · systemctl is-active nginx debe ser inactivo" "$REMOTO_FUNCS"'
set -euo pipefail
cliente="$1"
en_marcha=$(stacks_en_marcha)
ajenos=$(grep -v "^chronos-$cliente " <<<"$en_marcha" || true)
if [ -n "$ajenos" ]; then
  echo "Error: corren contenedores de otros stacks (riesgo de corromper datos compartidos):" >&2; echo "$ajenos" >&2; exit 1
fi
if [ "$cliente" = sony ]; then
  # chronos-sony y el stack v1 comparten db_data/mysql: solo se admite el MariaDB del propio chronos-sony.
  procesos=$( (pgrep -x mariadbd; pgrep -x mysqld) 2>/dev/null | wc -l || true)
  propios=$(grep -c "^chronos-sony .*mariadb" <<<"$en_marcha" || true)
  if [ "$procesos" -gt "$propios" ]; then
    echo "Error: hay $procesos proceso(s) MariaDB/MySQL y solo $propios de chronos-sony: no se despliega (riesgo de corromper los datos de Sony)" >&2; exit 1
  fi
fi
if systemctl is-active --quiet nginx; then echo "Error: nginx del host está activo (ocupa el puerto 80)" >&2; exit 1; fi
' "$CLIENTE" || die "La VM no está en un estado seguro para desplegar $CLIENTE"
ok "Los otros stacks y nginx están apagados"
((SOLO_COMPROBAR)) && { ok "Comprobaciones superadas (--solo-comprobar): no se despliega nada."; exit 0; }

# 3. Snapshot previo a migrar (solo se ejecuta si desplegar.sh llega a migrar).
SNAP="pre-update-$(date +%Y%m%d-%H%M)-caddy-$CLIENTE"
ANTES="virsh -c $(printf '%q' "$LIBVIRT_URI") snapshot-create-as $(printf '%q' "$VM_NAME") $SNAP --description $(printf '%q' "Antes de desplegar $CLIENTE con desplegar-caddy.sh") >/dev/null && echo \"Snapshot $SNAP creado. Revertir: virsh -c $LIBVIRT_URI snapshot-revert $VM_NAME $SNAP\""

# 4. desplegar.sh habla con ssh/rsync sin opciones: un ssh de envoltura en el PATH añade llave y known_hosts de staging.
ENVOLTURA=$(mktemp -d)
trap 'rm -rf "$ENVOLTURA"' EXIT
mkdir -p "$CACHE_DIR"
# shellcheck disable=SC2046
printf '#!/bin/sh\nexec /usr/bin/ssh %s "$@"\n' "$(_vm_ssh_opts)" > "$ENVOLTURA/ssh"
chmod +x "$ENVOLTURA/ssh"

ARGS=(--host "$VM_USER@$(vm_ip)" --dir "$DIR_REMOTO" --cliente "$CLIENTE" --staging
  --version-web "$V_WEB" --version-api "$V_API" --antes-de-migrar "$ANTES")
[[ -n "$CORREO" ]] && ARGS+=(--sembrar-admin "$CORREO" --admin-nombre "$NOMBRE")
((PERMITIR)) && ARGS+=(--permitir-migrar)
[[ "$SIMULAR" == "1" ]] && ARGS+=(--simular)

step "Desplegando $CLIENTE (web $V_WEB, api $V_API) en $VM_NAME"
PATH="$ENVOLTURA:$PATH" "$REPO_ROOT/infra/clientes/desplegar.sh" "${ARGS[@]}"
