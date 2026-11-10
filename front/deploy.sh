#!/bin/bash
set -e  # Para que el script se detenga ante cualquier error

# 0. Rutas sin `#` (v4.1.0+): el contenedor nginx del front debe devolver index.html en cualquier ruta.
#    Se exige front-nginx.conf (copia de front/nginx.conf) junto a almacen-front y montado en su docker-compose.yml.
#    Pasos: docs/front/arquitectura.md (sección Despliegue). Para omitir la comprobación: OMITIR_VERIFICACION_NGINX=1
if [[ "${OMITIR_VERIFICACION_NGINX:-0}" != "1" ]]; then
  BASE_REMOTA="$(dirname "~/teleset-almacen-test/almacen-front")"
  echo "Verificando la configuración de nginx del front en exolog.app:$BASE_REMOTA ..."
  if ! ssh cesargv@exolog.app "grep -q try_files $BASE_REMOTA/front-nginx.conf && grep -q front-nginx.conf $BASE_REMOTA/docker-compose.yml"; then
    echo "ERROR: falta $BASE_REMOTA/front-nginx.conf o no está montado en el contenedor del front."
    echo "Sin él, al recargar cualquier página distinta de / el servidor responde 404. Ver docs/front/arquitectura.md (sección Despliegue)."
    exit 1
  fi
fi

# # 1. Incrementar la versión (patch) en package.json
# echo "Obteniendo la versión actual desde package.json..."
# if ! command -v jq &> /dev/null; then
#   echo "Error: jq no está instalado. Instálalo con: sudo apt-get install jq"
#   exit 1
# fi

# # Extraer la versión actual
# current_version=$(jq -r '.version' package.json)
# echo "Versión actual: $current_version"

# # Suponiendo formato X.Y.Z, se incrementa Z (la revisión)
# IFS='.' read -r major minor patch <<< "$current_version"
# new_patch=$((patch + 1))
# # Incrementar minor si es par
# # NUMERO IMPARPAR INDICA QUE ES UNA VERSIÓN DE DESARROLLO
# # if (( minor % 2 == 0 )); then
# #     minor=$((minor + 1))
# #     new_version="$major.$minor.0"
# # else
#     new_version="$major.$minor.$new_patch"
# # fi
# echo "Nueva versión: $new_version"

# # Actualizar el campo version en package.json
# jq --arg new_version "$new_version" '.version = $new_version' package.json > tmp.json && mv tmp.json package.json
# echo "package.json actualizado con la nueva versión."

# # 2. Agregar un Tag en GIT con el nuevo número de versión
# # (Opcional: agregar y commitear los cambios de package.json)
# echo "Agregando cambios a GIT..."
# git add package.json
# git commit -m "Actualizando versión a $new_version"

# echo "Creando tag 'v$new_version' en GIT..."
# git tag -a "v$new_version" -m "Testing version $new_version"
# echo "Tag v$new_version creado."

# # 3. Compilar (ejecutar antes 'npm ci && npm run build' si no hay build/)

# 4. Copiar el contenido de la carpeta "./build" al servidor remoto
REMOTE_USER="cesargv"
REMOTE_HOST="exolog.app"
REMOTE_DIR="~/teleset-almacen-test/almacen-front"

echo "Copiando el contenido de ./build al servidor remoto $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
# Se utiliza scp con la opción -r para copiar recursivamente
rsync -avz --delete --rsync-path="sudo rsync" ./build/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}

echo "Actualizando permisos de carpeta $REMOTE_DIR ..."

ssh $REMOTE_USER@$REMOTE_HOST "sudo chown -R www-data:www-data ${REMOTE_DIR} && sudo find ${REMOTE_DIR} -type d -exec chmod 755 {} \; && sudo find ${REMOTE_DIR} -type f -exec chmod 644 {} \;"

echo "Proceso completado exitosamente. v$(node -p "require('./package.json').version")"
