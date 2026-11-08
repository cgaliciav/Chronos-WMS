import { Connection, ConnectionOptions, createConnection } from "typeorm";
import { ENTIDADES, SUSCRIPTORES } from "./entity";
import { logger } from "./helpers/logger";
import { aplicarParcheTypeorm } from "./helpers/parcheTypeorm";
import { MIGRACIONES } from "./migration";

export let conexion: Connection;

const nivelesSql = (valor: string | undefined): ConnectionOptions["logging"] =>
  !valor || valor === "false" ? false : valor === "all" ? "all" : (valor.split(",") as any);

/**
 * Opciones de la conexión a partir de las variables de entorno, con las listas explícitas de entidades, migraciones
 * y suscriptores: funciona igual con ts-node (src/) que con el código compilado (build/). ormconfig.js queda solo
 * para la CLI de TypeORM en desarrollo.
 */
export const opcionesConexion = (extra: Partial<ConnectionOptions> = {}): ConnectionOptions =>
  ({
    name: "default",
    type: "mariadb",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE_NAME,
    synchronize: process.env.DB_SYNCRO === "true",
    migrationsRun: false,
    logging: nivelesSql(process.env.DB_LOGGING),
    maxQueryExecutionTime: 30000,
    entities: ENTIDADES,
    migrations: MIGRACIONES,
    subscribers: SUSCRIPTORES,
    ...extra,
  } as ConnectionOptions);

/**
 * Abre la conexión. No ejecuta migraciones: en producción las aplica una persona con respaldo
 * (docs/api/procedimiento-migracion-produccion.md). Si hay migraciones pendientes se avisa en el log, porque el
 * código nuevo puede depender de tablas o columnas que aún no existen.
 */
export const conectarORM = async () => {
  aplicarParcheTypeorm(); // caché de replacePropertyNames (fase 4, docs/api/rendimiento.md)
  conexion = await createConnection(opcionesConexion());
  logger.info("conectado a la base de datos");
  if (conexion.options.synchronize) {
    logger.warn("ADVERTENCIA: DB_SYNCRO=true. El esquema debe cambiarse con migraciones.");
  }
  try {
    if (await conexion.showMigrations()) {
      logger.warn("ADVERTENCIA: hay migraciones pendientes. Aplícalas tras respaldar la BD (node build/migrar.js run).");
    }
  } catch (error) {
    logger.warn("No se pudo comprobar el estado de las migraciones:", (error as Error).message);
  }
};
