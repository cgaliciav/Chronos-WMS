import { Connection, createConnection } from "typeorm";
import { logger } from "./helpers/logger";
import { aplicarParcheTypeorm } from "./helpers/parcheTypeorm";

export let conexion: Connection;

/**
 * Abre la conexión "default" de ormconfig.js. No ejecuta migraciones: en producción las aplica una persona
 * con respaldo (docs/api/procedimiento-migracion-produccion.md). Si hay migraciones pendientes se avisa en
 * la consola, porque el código nuevo puede depender de tablas o columnas que aún no existen.
 */
export const conectarORM = async () => {
  aplicarParcheTypeorm(); // caché de replacePropertyNames (fase 4, docs/api/rendimiento.md)
  conexion = await createConnection();
  logger.info("conectado a la base de datos");
  if (conexion.options.synchronize) {
    logger.warn("ADVERTENCIA: DB_SYNCRO=true. El esquema debe cambiarse con migraciones (npm run migration:run).");
  }
  try {
    if (await conexion.showMigrations()) {
      logger.warn("ADVERTENCIA: hay migraciones pendientes. Ejecuta `npm run migration:run` tras respaldar la BD.");
    }
  } catch (error) {
    logger.warn("No se pudo comprobar el estado de las migraciones:", error.message);
  }
};
