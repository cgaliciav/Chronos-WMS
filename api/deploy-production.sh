#!/bin/bash
# Despliegue a PRODUCCIÓN. Ver desplegar.sh y docs/api/procedimiento-migracion-produccion.md.
exec "$(dirname "$0")/desplegar.sh" produccion
