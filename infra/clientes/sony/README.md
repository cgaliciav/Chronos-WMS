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
