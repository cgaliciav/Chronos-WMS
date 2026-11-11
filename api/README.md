# Almacen API

API REST del almacén de Teleset/Sony México (Express + TypeORM + MariaDB, TypeScript).

Documentación: [`../docs/api/`](../docs/api/) (modelo de datos, tipos de movimiento, endpoints),
guía para agentes en [`CLAUDE.md`](CLAUDE.md), fallos conocidos en
[`../docs/hallazgos-codigo.md`](../docs/hallazgos-codigo.md) y plan de evolución en
[`../docs/planes/02-api-relacion-movimientos.md`](../docs/planes/02-api-relacion-movimientos.md).

### Stack actual
- Node.js 24 LTS (`.nvmrc`; `engines` ≥ 22), imagen `node:24-alpine` multietapa (`Dockerfile`)
- MariaDB ≥ 10.11 (driver `mysql2` 3), TypeORM 1.1 (`src/data-source.ts`), Express 5, TypeScript 5.9, logs con pino
- Esquema por migraciones (`src/migration/`): `node build/migrar.js show|run|revert` en la imagen;
  procedimiento en [`../docs/api/procedimiento-migracion-produccion.md`](../docs/api/procedimiento-migracion-produccion.md)
- Scripts: `npm run dev` (ts-node-dev), `npm start` (ts-node), `npm run build` + `npm run prod` (compilado),
  `npm run typecheck`, `npm run test:unit`, `npm run test:int`, `npm run rendimiento`
  (ver [`../docs/api/pruebas.md`](../docs/api/pruebas.md) y [`../docs/api/rendimiento.md`](../docs/api/rendimiento.md))
- Despliegue: `./desplegar.sh pruebas|produccion` (o `deploy.sh` / `deploy-production.sh`); cambios en [`CHANGELOG.md`](CHANGELOG.md)

### Historia
Proyecto originalmente pensado para el almacén de Teleset/Sony en México; ha ido cambiando constantemente.
03-AGOSTO-2024: cambios relacionados con la edición de compras.

### Variables de entorno necesarias

Ver `.env.example`. Los secretos nunca se versionan.

- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM

- JWTSECRET=<secreto>
- SALT_ROUNDS=10
- API_ALMACEN=https://almacen-api.localto.net
- RUTA_ARCHIVOS=/mnt/d/exogrid/AlmacenTeleset_v2/exogrid/archivos/
- RUTA_REPORTES=/mnt/d/exogrid/AlmacenTeleset_v2/exogrid/reportes/
- UPLOADS=/mnt/d/exogrid/AlmacenTeleset_v2/exogrid/uploads/
- ARCHIVOS_AUXILIARES=/mnt/d/exogrid/AlmacenTeleset_v2/exogrid/auxiliares/
- DIAS_CUARENTENA=120
- LOG_CONSOLE_VERBOSE=error
- IMAGENES_IMPORTACION=/mnt/d/exogrid/AlmacenTeleset_v2/exogrid/imgproductos/
- PORT_ALMACEN_API=4100
- DB_HOST=localhost
- DB_USER=almacen_usr
- DB_PORT=3306
- DB_PASSWORD=<secreto>
- DB_DATABASE_NAME=almacen_sony_migracion
-  DB_SYNCRO=true
- DB_CACHE=true
- DB_LOGGING=all 

### Base nueva (cliente nuevo)

Una base vacía con las migraciones aplicadas (`node build/migrar.js run`) necesita los catálogos y un primer
administrador. `src/semilla/catalogo.json` (tipos de movimiento con sus ids fijos, roles, tipos de precio, factura y
producto, parámetros) sale de la base de Sony y se versiona; áreas, bodegas, proyectos y proveedores los captura el cliente.

    node build/sembrar.js --admin-correo <correo> --admin-nombre "<nombre>" [--regenerar]
    # en desarrollo: npm run semilla:run -- --admin-correo <correo> --admin-nombre "<nombre>"

Imprime la contraseña temporal (72 h, cambio obligatorio) y la envía por correo (si el envío falla solo avisa).
Es idempotente (`INSERT IGNORE`; no cambia la contraseña de un administrador existente salvo con `--regenerar`) y se
niega a correr si la base ya tiene movimientos. Salida: 0 bien, 2 uso incorrecto, 3 base en uso, 1 otro error.

Para regenerar `catalogo.json` desde una base de Sony (solo lectura): `DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=...
DB_DATABASE_NAME=... npm run semilla:extraer`, y revisa el diff a mano (no debe haber datos personales).

### Referencias
https://medium.com/javascript-in-plain-english/creating-a-rest-api-with-jwt-authentication-and-role-based-authorization-using-typescript-fbfa3cab22a4
https://typeorm.io/#/


## Pendientes 290905
- Crear una nueva branch para sacar toda la información de la BD o modificar la BD Actual?
- Direccionar la DB de pruebas a la local que tengo en docker
- En el DB de docker crear el usuario necesario para no usar root

- Reestructurar la DB.
- Se debe crear el registro de devolucion asociado directamente al registro de prestamo (verificar caso de compra)
- Las compras deben poder ser realizadas y despues cambiar los datos de la factura
- Cambiar productos de facturas
- Los campos de los reportes son distintos
- Las devoluciones deben ser mas inteligentes para poder determinar cuando fueron prestadas a otras personas o incluso producciones y notificar el hecho.
- Las devoluciones Nunca deben duplicarse
- Los prestamos no deben duplicarse
- Deben poder hacerse transferencias de prestamos
- Impresion de etiquetas
- Mandar de un resultado de busqueda a la creacion de un reporte
- Los grupos de productos puenden no estar asociados a ningun movimiento. 