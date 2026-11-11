#!/usr/bin/env bash
# Promueve una imagen de staging a producción: la misma imagen (mismo digest) con la etiqueta X.Y.Z, sin -s.
# Uso: infra/imagenes/promover.sh web|api X.Y.Z
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

(($# == 2)) || die "Uso: promover.sh web|api X.Y.Z"
APP="$1"; VERSION="$2"
validar_app "$APP"
validar_version "$VERSION"
require_cmds docker
cargar_config

IMAGEN="$DOCKERHUB_NS/chronos-$APP"
ORIGEN="$IMAGEN:$VERSION-s"
DESTINO="$IMAGEN:$VERSION"

step "Comprobando origen y destino"
etiqueta_existe "$ORIGEN" || die "$ORIGEN no existe; construye primero con construir.sh $APP"
if etiqueta_existe "$DESTINO"; then die "$DESTINO ya publicada; sube la versión"; fi
ok "$ORIGEN existe y $DESTINO está libre"

step "Promoviendo $ORIGEN -> $DESTINO"
docker buildx imagetools create -t "$DESTINO" "$ORIGEN"

D_ORIGEN="$(digest_de "$ORIGEN")"
D_DESTINO="$(digest_de "$DESTINO")"
[[ "$D_ORIGEN" == "$D_DESTINO" ]] || die "Los digests no coinciden: $D_ORIGEN vs $D_DESTINO"
ok "Etiqueta: $DESTINO"
ok "Digest:   $D_DESTINO (igual que $ORIGEN)"
