#!/bin/bash
set -e  # Detener el script ante cualquier error

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
git commit -m "Incrementar versión a $new_version"

echo "Creando tag 'v$new_version' en GIT..."
git tag -a "v$new_version" -m "Release version $new_version"
echo "Tag v$new_version creado."

#############################################
# Configuración - Modifica estas variables según corresponda
#############################################
REMOTE_USER="cesargv"
REMOTE_HOST="exolog.app"
# Directorio destino donde se copiarán los archivos del backend
REMOTE_BACKEND_DIR="~/teleset-almacen-test/almacen-api-v3"
# Directorio donde se encuentra el archivo docker-compose.yml
REMOTE_PROJECT_DIR="~/teleset-almacen-test"

#############################################
# 3. Copiar todos los archivos a la carpeta remota
#############################################
echo "Copiando archivos al servidor remoto $REMOTE_USER@$REMOTE_HOST..."
# Se excluye la carpeta node_modules para evitar copiar dependencias ya instaladas
rsync -avz --exclude "node_modules" --exclude "deploy_history/" --exclude "deploy*.sh" --exclude ".vscode/" --exclude ".env" --exclude ".git/"--rsync-path="sudo rsync" ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BACKEND_DIR}

#############################################
# 4. Conectarse al servidor remoto y gestionar el servicio backend
#############################################
echo "Conectando al servidor remoto para gestionar el servicio backend..."
ssh ${REMOTE_USER}@${REMOTE_HOST} <<EOF
set -e
echo "Entrando en el directorio del proyecto: ${REMOTE_BACKEND_DIR}"
cd ${REMOTE_BACKEND_DIR}

echo "Deteniendo el servicio backend..."
docker kill almacen-backend-test_1

echo "Removiendo el servicio backend"
docker rm almacen-backend-test_1

echo "Reconstruyendo el servicio backend..."
 docker build -t almacen-backend-test:$new_version -t almacen-backend-test:latest .

echo "Activando el servicio backend..."
docker run -d --env-file ${REMOTE_PROJECT_DIR}/api-secrets.env --name almacen-backend-test_1 -p 34200:4200 -v ./exogrid:/code_test/exogrid --network teleset-almacen-test_default almacen-backend-test

echo "Proceso de despliegue en el servidor remoto completado."
EOF

echo "Despliegue del backend completado exitosamente. v$new_version"
