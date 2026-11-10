#!/bin/bash
set -e  # Para que el script se detenga ante cualquier error

# 0. Rutas sin `#` (v4.1.0+): el contenedor nginx del front debe devolver index.html en cualquier ruta.
#    Se exige front-nginx.conf (copia de front/nginx.conf) junto a front-www y montado en su docker-compose.yml.
#    Pasos: docs/front/arquitectura.md (sección Despliegue). Para omitir la comprobación: OMITIR_VERIFICACION_NGINX=1
if [[ "${OMITIR_VERIFICACION_NGINX:-0}" != "1" ]]; then
  BASE_REMOTA="$(dirname "~/teleset-almacen/front-www")"
  echo "Verificando la configuración de nginx del front en exolog.app:$BASE_REMOTA ..."
  if ! ssh cesargv@exolog.app "grep -q try_files $BASE_REMOTA/front-nginx.conf && grep -q front-nginx.conf $BASE_REMOTA/docker-compose.yml"; then
    echo "ERROR: falta $BASE_REMOTA/front-nginx.conf o no está montado en el contenedor del front."
    echo "Sin él, al recargar cualquier página distinta de / el servidor responde 404. Ver docs/front/arquitectura.md (sección Despliegue)."
    exit 1
  fi
fi

# 1. Incrementar la versión (patch) en package.json y package-lock.json
echo "Versión actual: $(node -p "require('./package.json').version")"
new_version=$(npm version patch --no-git-tag-version | sed 's/^v//')
echo "Nueva versión: $new_version"

# 2. Agregar un Tag en GIT con el nuevo número de versión
# (Opcional: agregar y commitear los cambios de package.json)
echo "Agregando cambios a GIT..."
git add package.json package-lock.json
git commit -m "Updatind PRODUCTION version to $new_version"

echo "Creando tag 'v$new_version' en GIT..."
git tag -a "v$new_version" -m "PRODUCTION version $new_version"
echo "Tag PRODUCCION v$new_version creado."

# 3. Instalar dependencias exactas y compilar (Vite, Node >= 24)
echo "Ejecutando 'npm ci' y 'npm run build'..."
npm ci
npm run build
echo "'npm run build' finalizado correctamente."

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
