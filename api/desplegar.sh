#!/bin/bash
# Despliegue del API en el servidor (plan 02 fase 4). Uso: ./desplegar.sh pruebas|produccion
#
# 1. Calcula la versión nueva (patch + 1) en package.json.
# 2. Copia el código al servidor y construye la imagen (Dockerfile multietapa, Node 24).
# 3. Se DETIENE si hay migraciones pendientes: aplícalas antes siguiendo docs/api/procedimiento-migracion-produccion.md.
# 4. Sustituye el contenedor y comprueba que responde.
# 5. Solo si todo fue bien: commit de package.json y tag vX.Y.Z (antes se hacían ANTES de desplegar).
set -euo pipefail

ENTORNO="${1:-}"
REMOTE_USER="cesargv"
case "$ENTORNO" in
  pruebas)
    REMOTE_HOST="exolog.app"
    REMOTE_BACKEND_DIR="~/teleset-almacen-test/almacen-api-v3"
    REMOTE_PROJECT_DIR="~/teleset-almacen-test"
    IMAGEN="almacen-backend-test"
    CONTENEDOR="almacen-backend-test_1"
    PUERTO=34200
    RED="teleset-almacen-test_default"
    ;;
  produccion)
    REMOTE_HOST="172.235.36.194"
    REMOTE_BACKEND_DIR="~/teleset-almacen/api-www"
    REMOTE_PROJECT_DIR="~/teleset-almacen"
    IMAGEN="almacen-backend"
    CONTENEDOR="almacen-backend-1"
    PUERTO=34400
    RED="teleset-almacen_default"
    ;;
  *)
    echo "Uso: $0 pruebas|produccion" >&2
    exit 2
    ;;
esac

command -v jq >/dev/null || { echo "Error: jq no está instalado (sudo apt-get install jq)" >&2; exit 1; }
if ! git diff --quiet -- package.json; then
  echo "Error: package.json tiene cambios sin confirmar" >&2
  exit 1
fi

version_actual=$(jq -r '.version' package.json)
IFS='.' read -r major minor patch <<< "$version_actual"
version_nueva="$major.$minor.$((patch + 1))"
echo "Versión: $version_actual → $version_nueva ($ENTORNO)"
jq --arg v "$version_nueva" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json

# Si algo falla antes del final, package.json vuelve a la versión anterior y no se crea el tag.
restaurar() { git checkout -- package.json; echo "Despliegue cancelado; package.json restaurado." >&2; }
trap restaurar ERR

echo "Copiando el código a $REMOTE_USER@$REMOTE_HOST:$REMOTE_BACKEND_DIR…"
rsync -avz --delete \
  --exclude node_modules --exclude build --exclude tmp --exclude deploy_history \
  --exclude '*.sh' --exclude .env --exclude .vscode --exclude .git \
  --rsync-path="sudo rsync" ./ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BACKEND_DIR}"

ssh "${REMOTE_USER}@${REMOTE_HOST}" bash -s <<REMOTO
set -euo pipefail
cd ${REMOTE_BACKEND_DIR}
echo "Construyendo la imagen ${IMAGEN}:${version_nueva}…"
docker build -t ${IMAGEN}:${version_nueva} -t ${IMAGEN}:latest .

echo "Comprobando migraciones pendientes…"
if ! docker run --rm --env-file ${REMOTE_PROJECT_DIR}/api-secrets.env -e DB_SYNCRO=false --network ${RED} ${IMAGEN}:${version_nueva} node build/migrar.js show; then
  echo "HAY MIGRACIONES PENDIENTES (o no se pudo consultar la BD). Sigue docs/api/procedimiento-migracion-produccion.md y vuelve a desplegar." >&2
  exit 1
fi

# La imagen corre como el usuario node (uid 1000): el volumen de archivos debe pertenecerle.
sudo mkdir -p ${REMOTE_PROJECT_DIR}/exogrid
sudo chown -R 1000:1000 ${REMOTE_PROJECT_DIR}/exogrid

echo "Sustituyendo el contenedor ${CONTENEDOR}…"
docker rm -f ${CONTENEDOR} >/dev/null 2>&1 || true
cd ${REMOTE_PROJECT_DIR}
docker run -d --restart unless-stopped --env-file ${REMOTE_PROJECT_DIR}/api-secrets.env -e DB_SYNCRO=false \
  --name ${CONTENEDOR} -p ${PUERTO}:4200 -v ${REMOTE_PROJECT_DIR}/exogrid:/code/exogrid --network ${RED} ${IMAGEN}:${version_nueva}

echo "Esperando a que responda…"
for intento in \$(seq 1 30); do
  if docker exec ${CONTENEDOR} wget -qO- http://127.0.0.1:4200/auth/version; then echo; exit 0; fi
  sleep 2
done
echo "El contenedor no respondió en 60 s. Revisa: docker logs ${CONTENEDOR}" >&2
exit 1
REMOTO

trap - ERR
git add package.json
git commit -m "Versión $version_nueva desplegada en $ENTORNO"
git tag -a "v$version_nueva" -m "Versión $version_nueva ($ENTORNO)"
echo "Despliegue completado: v$version_nueva en $ENTORNO. Recuerda: git push && git push --tags"
