#!/usr/bin/env bash
# Construye una imagen (chronos-web o chronos-api) desde una ref de git y la publica en Docker Hub como X.Y.Z-s.
# Uso: infra/imagenes/construir.sh web|api [--ref <git-ref>] [--comprobar] [--local]
#   --ref <ref>   ref a construir (por defecto HEAD, que exige árbol limpio)
#   --comprobar   solo valida (versión, árbol, etiqueta libre); no construye ni publica
#   --local       construye y deja la imagen en el Docker local (--load), sin publicar ni consultar si ya existe
# X.Y.Z sale del package.json de la app (front/ para web, api/ para api) quitando el sufijo -d.
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

APP=""; REF="HEAD"; COMPROBAR=0; LOCAL=0
while (($#)); do
  case "$1" in
    web|api) APP="$1" ;;
    --ref) shift; REF="${1:-}"; [[ -n "$REF" ]] || die "--ref necesita un valor" ;;
    --comprobar) COMPROBAR=1 ;;
    --local) LOCAL=1 ;;
    *) die "Argumento desconocido: $1 (uso: construir.sh web|api [--ref <git-ref>] [--comprobar] [--local])" ;;
  esac
  shift
done
validar_app "$APP"
((COMPROBAR == 0 || LOCAL == 0)) || die "--comprobar y --local son excluyentes"
require_cmds git docker tar
cargar_config

step "Resolviendo la ref $REF"
SHA="$(git -C "$REPO_ROOT" rev-parse --verify "$REF^{commit}")" || die "La ref '$REF' no existe"
if [[ "$REF" == "HEAD" ]]; then
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain)" ]] || die "El árbol tiene cambios sin confirmar; confirma o usa --ref <ref>"
fi
VERSION="$(version_sin_sufijo "$(version_en_ref "$SHA" "$APP")")"
IMAGEN="$DOCKERHUB_NS/chronos-$APP"
ETIQUETA="$VERSION-s"
ok "chronos-$APP $VERSION desde ${SHA:0:12}; etiqueta $IMAGEN:$ETIQUETA"

if ((LOCAL == 0)); then
  step "Comprobando que $IMAGEN:$ETIQUETA no esté publicada"
  exigir_no_publicada "$IMAGEN:$ETIQUETA"
fi
if ((COMPROBAR)); then
  ok "Comprobaciones correctas (no se construyó ni publicó nada)"
  exit 0
fi

step "Exportando $SHA con git archive"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$REPO_ROOT" archive "$SHA" | tar -x -C "$TMP"

ARGS=(buildx build --platform linux/amd64 --provenance=false
  --label "org.opencontainers.image.version=$VERSION"
  --label "org.opencontainers.image.revision=$SHA"
  --metadata-file "$TMP/metadata.json")
if [[ "$APP" == "api" ]]; then
  # Misma regla que front: la versión dentro de la imagen no lleva sufijo.
  sed -i '0,/^\( *"version": *\)"[^"]*"/s//\1"'"$VERSION"'"/' "$TMP/api/package.json"
  ARGS+=(-t "$IMAGEN:$ETIQUETA" "$TMP/api")
else
  ARGS+=(-f "$TMP/infra/web/Dockerfile" --build-arg "VERSION=$VERSION" --build-arg "VITE_SENTRY_DSN=$SENTRY_DSN_FRONT"
    -t "$IMAGEN:$ETIQUETA" "$TMP")
fi
if ((LOCAL)); then ARGS+=(--load); else ARGS+=(--push); fi

if ((LOCAL)); then step "Construyendo $IMAGEN:$ETIQUETA (solo local)"; else step "Construyendo y publicando $IMAGEN:$ETIQUETA"; fi
docker "${ARGS[@]}"

DIGEST="$(sed -n 's/.*"containerimage.digest": *"\([^"]*\)".*/\1/p' "$TMP/metadata.json" | head -1)"
ok "Etiqueta: $IMAGEN:$ETIQUETA"
ok "Digest:   ${DIGEST:-desconocido}"
((LOCAL == 0)) || warn "Imagen solo local: no se publicó nada"
