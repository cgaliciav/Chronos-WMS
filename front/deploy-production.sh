#!/bin/bash
set -e  # Para que el script se detenga ante cualquier error

# 1. Incrementar la versión (patch) en package.json
echo "Obteniendo la versión actual desde package.json..."
if ! command -v jq &> /dev/null; then
  echo "Error: jq no está instalado. Instálalo con: sudo apt-get install jq"
  exit 1
fi

# Extraer la versión actual
current_version=$(jq -r '.version' package.json)
echo "Versión actual: $current_version"

# Suponiendo formato X.Y.Z, se incrementa Z (la revisión)
IFS='.' read -r major minor patch <<< "$current_version"
new_patch=$((patch + 1))

new_version="$major.$minor.$new_patch"

echo "Nueva versión: $new_version"

# Actualizar el campo version en package.json
jq --arg new_version "$new_version" '.version = $new_version' package.json > tmp.json && mv tmp.json package.json
echo "package.json actualizado con la nueva versión."

# 2. Agregar un Tag en GIT con el nuevo número de versión
# (Opcional: agregar y commitear los cambios de package.json)
echo "Agregando cambios a GIT..."
git add package.json
git commit -m "Updatind PRODUCTION version to $new_version"

echo "Creando tag 'v$new_version' en GIT..."
git tag -a "v$new_version" -m "PRODUCTION version $new_version"
echo "Tag PRODUCCION v$new_version creado."

# 3. Ejecutar el comando "yarn build"
echo "Ejecutando 'yarn build'..."
export NODE_OPTIONS=--max_old_space_size=4096
yarn build
echo "'yarn build' finalizado correctamente."

# 4. Copiar el contenido de la carpeta "./build" al servidor remoto
REMOTE_USER="cesargv"
REMOTE_HOST="exolog.app"
REMOTE_DIR="~/teleset-almacen/front-www"

echo "Copiando el contenido de ./build al servidor remoto $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR ..."
# Se utiliza scp con la opción -r para copiar recursivamente
rsync -avz --delete --rsync-path="sudo rsync" ./build/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}

echo "Actualizando permisos de carpeta $REMOTE_DIR ..."

ssh $REMOTE_USER@$REMOTE_HOST "sudo chown -R www-data:www-data ${REMOTE_DIR} && sudo find ${REMOTE_DIR} -type d -exec chmod 755 {} \; && sudo find ${REMOTE_DIR} -type f -exec chmod 644 {} \;"


# 5. Comprimir el contenido de la carpeta build y guardar el archivo en ./deploy_history
echo "Comprimiendo el contenido de la carpeta build..."
archive_name="$new_version.tar.gz"
mkdir -p ./deploy_history
# El parámetro -C indica que se comprime el contenido de build sin incluir el directorio en sí
tar -czvf ./deploy_history/"$archive_name" -C build .
echo "Archivo comprimido: ./deploy_history/$archive_name"


echo "Proceso completado exitosamente. v$new_version"
