#!/usr/bin/env bash
# Compatibilidad: despliega solo el API en STAGING con update-staging.sh (build, migraciones, comprobaciones).
#   ./deploy-api-staging.sh            # = ./update-staging.sh --api-only
#   ./deploy-api-staging.sh --rollback # = ./update-staging.sh --api-only --rollback (imagen de producción)
# Cualquier otra opción se pasa tal cual (--ref, --no-migrate, -y…).
exec "$(dirname "$0")/update-staging.sh" --api-only "$@"
