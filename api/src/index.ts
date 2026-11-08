import * as dotenv from "dotenv";
import "reflect-metadata";

import { conectarORM } from "./conexionORM";
import { crearApp } from "./app";
import { iniciarSentry } from "./sentry";
import { iniciarLimpiezaCache } from "./helpers/cacheArchivos";

import { getConnection } from "typeorm";

(async () => {
  console.log("******PROCESO EN", process.env.NODE_ENV);
  if (process.env.NODE_ENV !== "production") dotenv.config({ quiet: true });
  if (!process.env.JWTSECRET || process.env.JWTSECRET.length < 32) {
    console.error("JWTSECRET debe existir y tener al menos 32 caracteres. Abortando.");
    process.exit(1);
  }
  if (iniciarSentry()) console.log("Sentry activo");
  await conectarORM();
  iniciarLimpiezaCache(); // caché de archivos (CACHE_ARCHIVOS_DIAS) y reportes (REPORTES_DIAS), hallazgo M17

  const app = crearApp({ registrarPeticiones: true });

  const PUERTO_API = process.env.PORT_ALMACEN_API ? +process.env.PORT_ALMACEN_API : 8000;

  const http_server = app.listen(PUERTO_API, "0.0.0.0", () => {
    console.log(`Express funcionando en el puerto ${PUERTO_API}. http://localhost:${PUERTO_API}/`);
  });
  app.on("error", (e) => {
    console.log("ERROR EXPRESS LISTEN", { e });
  });

  const cerrarOrdenadamente = async (senal: string) => {
    console.log(`Señal ${senal} recibida: cerrando servidor HTTP`);
    if (http_server.listening) {
      http_server.close(() => {
        console.log("Servidor HTTP cerrado");
      });
    }
    await closeDatabaseConnection();
    process.exit(0);
  };

  process.on("SIGTERM", () => cerrarOrdenadamente("SIGTERM"));
  process.on("SIGINT", () => cerrarOrdenadamente("SIGINT"));

})();

async function closeDatabaseConnection() {
  const connection = getConnection();
  if (connection.isConnected) {
    await connection.close();
    console.log("Conexión a la base de datos cerrada");
  }
}
