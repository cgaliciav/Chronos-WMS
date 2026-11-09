import "reflect-metadata";
import { Connection, ConnectionOptions, createConnection, getConnectionManager } from "typeorm";
import { ENTIDADES, SUSCRIPTORES } from "../entity";
import { MIGRACIONES } from "../migration";
import { aplicarParcheTypeorm } from "../helpers/parcheTypeorm";

/** Opciones de conexión para pruebas, independientes de ormconfig.js y del cwd (clases explícitas, sin glob). */
export const opcionesConexionPruebas = (extra: Partial<ConnectionOptions> = {}): ConnectionOptions =>
  ({
    name: "default",
    type: "mariadb",
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE_NAME,
    synchronize: false,
    logging: false,
    entities: ENTIDADES,
    subscribers: SUSCRIPTORES,
    migrations: MIGRACIONES,
    ...extra,
  } as ConnectionOptions);

export const conectarPruebas = async (extra: Partial<ConnectionOptions> = {}): Promise<Connection> => {
  aplicarParcheTypeorm(); // igual que conectarORM: las pruebas ejercitan el parche
  const manager = getConnectionManager();
  if (manager.has("default") && manager.get("default").isConnected) {
    return manager.get("default");
  }
  return createConnection(opcionesConexionPruebas(extra));
};

export const cerrarPruebas = async () => {
  const manager = getConnectionManager();
  if (manager.has("default") && manager.get("default").isConnected) {
    await manager.get("default").close();
  }
};
