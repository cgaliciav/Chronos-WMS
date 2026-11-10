import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { ENTIDADES, SUSCRIPTORES } from "./entity";
import { logger } from "./helpers/logger";
import { MIGRACIONES } from "./migration";

const nivelesSql = (valor: string | undefined): DataSourceOptions["logging"] =>
  !valor || valor === "false" ? false : valor === "all" ? "all" : (valor.split(",") as DataSourceOptions["logging"]);

/**
 * Opciones de la fuente de datos a partir de las variables de entorno, con las listas explícitas de entidades,
 * migraciones y suscriptores: funcionan igual con ts-node (src/) que con el código compilado (build/).
 * `extra` sirve a los scripts que necesitan otra configuración (migraciones, BD de pruebas).
 */
export const opcionesDataSource = (extra: Partial<DataSourceOptions> = {}): DataSourceOptions =>
  ({
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
  }) as DataSourceOptions;

/**
 * La fuente de datos de la aplicación (TypeORM 1.x). Se construye al importar este módulo, así que cada punto de
 * entrada carga antes las variables (`./entorno` en index.ts y migrar.ts, `test/env` en las pruebas). No conecta
 * hasta `conectarORM()` (o `conectarPruebas()`).
 *
 * Consultas: `AppDataSource.getRepository(X)`, `AppDataSource.query(...)` y, dentro de una transacción, el
 * `EntityManager` que recibe el callback (`MovimientoService.enTransaccion`).
 */
export const AppDataSource = new DataSource(opcionesDataSource());

/**
 * Conecta. No ejecuta migraciones: en producción las aplica una persona con respaldo
 * (docs/api/procedimiento-migracion-produccion.md). Si hay migraciones pendientes se avisa en el log, porque el
 * código nuevo puede depender de tablas o columnas que aún no existen.
 */
export const conectarORM = async () => {
  await AppDataSource.initialize();
  logger.info("conectado a la base de datos");
  if (AppDataSource.options.synchronize) {
    logger.warn("ADVERTENCIA: DB_SYNCRO=true. El esquema debe cambiarse con migraciones.");
  }
  try {
    if (await AppDataSource.showMigrations()) {
      logger.warn("ADVERTENCIA: hay migraciones pendientes. Aplícalas tras respaldar la BD (node build/migrar.js run).");
    }
  } catch (error) {
    logger.warn("No se pudo comprobar el estado de las migraciones:", (error as Error).message);
  }
};
