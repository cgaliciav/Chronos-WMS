import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { AppDataSource, opcionesDataSource } from "../data-source";

/**
 * Opciones de la BD de pruebas (.env.test): las de la app, sin `synchronize` ni registro de SQL. Para los scripts
 * que necesitan su propia fuente de datos (resetDb, generarMigracion).
 */
export const opcionesPruebas = (extra: Partial<DataSourceOptions> = {}): DataSourceOptions =>
  opcionesDataSource({ synchronize: false, logging: false, ...extra } as Partial<DataSourceOptions>);

/** Fuente de datos independiente de la de la app (p. ej. con `dropSchema` o sin suscriptores). */
export const fuentePruebas = (extra: Partial<DataSourceOptions> = {}) => new DataSource(opcionesPruebas(extra));

/**
 * Conecta la fuente de datos de la app (la misma que usan los controladores) contra la BD de pruebas. Jest aísla los
 * módulos de cada archivo de pruebas, así que cada suite tiene su propia instancia de `AppDataSource`.
 * `extra` admite `logging` y `logger` (rendimiento.ts cuenta las consultas).
 */
export const conectarPruebas = async (extra: Pick<DataSourceOptions, "logging" | "logger"> = {}): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    // `setOptions` solo rehace el logger si recibe `logger` o `logging`; con un logger explícito `logging: false` sí calla
    // el registro de errores SQL que DB_LOGGING=error activaría (como antes de TypeORM 1.x).
    AppDataSource.setOptions({ synchronize: false, logger: "advanced-console", logging: false, ...extra });
    await AppDataSource.initialize();
  }
  return AppDataSource;
};

export const cerrarPruebas = async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
};
