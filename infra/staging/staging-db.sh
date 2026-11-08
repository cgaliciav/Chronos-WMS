#!/usr/bin/env bash
# Helper que vive en la VM (~/teleset-almacen/bin/staging-db). Las contraseñas se leen de ../.env
# y nunca salen de la VM.
#   staging-db sql [args mysql]     # SQL por stdin como root
#   staging-db restore <bytes>      # dump .sql.gz por stdin (con barra de progreso)
#   staging-db app-user             # crea/actualiza almacen_usr con los grants de prod
#   staging-db count <tabla>        # COUNT(*) de una tabla de la app
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
set -a
# shellcheck disable=SC1091
. ./.env
set +a
C=teleset-almacen_mariadb_1
DB=almacen_sony_migracion
mysql_root() { docker exec -i -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$C" mysql -uroot "$@"; }

case "${1:-}" in
  sql) shift; mysql_root "$@" ;;
  restore)
    if command -v pv >/dev/null; then pv -f -pterb -s "${2:-0}"; else cat; fi \
      | gunzip | mysql_root --max-allowed-packet=512M ;;
  app-user)
    # DB_PASSWORD es hexadecimal (openssl rand -hex), seguro dentro de comillas SQL.
    mysql_root <<SQL
CREATE USER IF NOT EXISTS 'almacen_usr'@'%' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER 'almacen_usr'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`almacen_sony_migracion\`.* TO 'almacen_usr'@'%';
GRANT ALL PRIVILEGES ON \`almacen_sony_mexico_prod\`.* TO 'almacen_usr'@'%';
FLUSH PRIVILEGES;
SQL
    ;;
  count) mysql_root -N -e "SELECT COUNT(*) FROM \`$2\`" "$DB" ;;
  *) echo "uso: $0 {sql|restore <bytes>|app-user|count <tabla>}" >&2; exit 2 ;;
esac
