# Configuración del cliente Sony (plan 03, fase 5)

`configuracion.json` es la configuración de Teleset/Sony México en el formato de `GET /config/export`: la marca
(nombre, título, bienvenida, organización), el remitente histórico y los asuntos de correo de siempre. Con ella los
usuarios actuales no ven cambios de identidad al pasar a Chronos WMS. La prueba `configuracion.int.test.ts` la importa
en cada `npm run test:int`: si cambian los esquemas y deja de validar, falla.

- **Sin secretos:** `correo.transporte` es `null`, así que se sigue usando el SMTP de las variables `SMTP_*` del
  servidor (Postmark). La contraseña SMTP nunca va en este archivo.
- **Sin logo de reportes:** el JPEG histórico vive en el servidor, no en el repositorio. Añádelo antes de importar:

```bash
# En el servidor de producción (ajusta la ruta a ARCHIVOS_AUXILIARES dentro del volumen exogrid)
LOGO=~/teleset-almacen/exogrid/auxiliares/sony-tv-logo.jpg
jq --arg logo "$(base64 -w0 "$LOGO")" '.imagenes.reportes = $logo' configuracion.json > sony.import.json
```

Importar: en la app, **Configuración → Importar** con `sony.import.json` (usuario con `ADMINISTRADOR` o
`CONFIGURACION-EDITAR`), o con `curl -X POST -H "auth: <token>" -H "Content-Type: application/json"
--data @sony.import.json https://<dominio>/api/config/import`. El procedimiento completo está en
`docs/api/procedimiento-migracion-produccion.md` ("Plan 03").

## Sony con Caddy en Docker

Con la imagen `chronos-web` Caddy sustituye al nginx del host y al contenedor nginx del front, y obtiene el certificado
por DNS-01. El stack es `infra/clientes/compose.yml` (+ `compose.staging.yml` en staging) y reutiliza los datos de hoy:
`DATOS_DIR` apunta a la carpeta que contiene `db_data/mysql` y `exogrid/` (staging: `/home/cesargv/teleset-almacen`),
con MariaDB 10.3 y la base `almacen_sony_migracion`.

1. En el servidor, en el directorio del despliegue, copia `.env.caddy.example` como `.env` (`chmod 600`) y llena los
   secretos (`DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWTSECRET`, `CONFIG_CLAVE`, `DNS_TOKEN` real, `ACME_EMAIL`, `DOMINIOS`).
2. Despliega (desde la raíz del repo):

```bash
infra/clientes/desplegar.sh --host <ssh> --dir <ruta remota> --cliente sony \
  --version-web X.Y.Z-s --version-api X.Y.Z-s [--staging]
```

Con Sony el script **se detiene si hay migraciones pendientes**: aplícalas con
`docs/api/procedimiento-migracion-produccion.md` o repite con `--permitir-migrar`, que a su vez exige `--antes-de-migrar <comando>` (el snapshot de los datos, en staging) o, bajo tu
responsabilidad, `--sin-snapshot`. `--simular` muestra los pasos sin tocar ningún servidor.
