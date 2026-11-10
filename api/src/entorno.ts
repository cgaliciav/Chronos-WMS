/**
 * Carga `.env` (o `ENV_FILE`) fuera de producción. Debe ser el PRIMER import de cada punto de entrada (index.ts,
 * migrar.ts): los imports se evalúan antes que el cuerpo del módulo y varios módulos leen `process.env` al cargarse
 * (transporte SMTP de helpers/enviarMail, nivel de helpers/logger, `dest` de multer en las rutas). Hallazgo M34.
 * En producción las variables vienen del contenedor y no se lee ningún archivo.
 */
import * as dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: process.env.ENV_FILE ?? ".env", quiet: true });
}
