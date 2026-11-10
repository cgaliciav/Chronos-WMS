#!/usr/bin/env bash
# Se instala en la VM como /usr/local/sbin/staging-block-smtp y lo ejecuta un unit systemd.
# Impide que cualquier contenedor envíe correo a internet (staging tiene emails reales de usuarios).
# El tráfico entre contenedores (backend -> mailpit) no sale por la interfaz externa y no se afecta.
set -euo pipefail
IFACE=$(ip route show default | awk '{print $5; exit}')
[[ -n "$IFACE" ]] || { echo "sin ruta por defecto" >&2; exit 1; }
for _ in $(seq 1 30); do iptables -nL DOCKER-USER >/dev/null 2>&1 && break; sleep 2; done
# shellcheck disable=SC2054
RULE=(-o "$IFACE" -p tcp -m multiport --dports 25,465,587,2525 -j REJECT --reject-with tcp-reset)
iptables -C DOCKER-USER "${RULE[@]}" 2>/dev/null || iptables -I DOCKER-USER "${RULE[@]}"
# El propio host tampoco envía correo.
iptables -C OUTPUT "${RULE[@]}" 2>/dev/null || iptables -I OUTPUT "${RULE[@]}"
echo "SMTP saliente bloqueado en $IFACE"
