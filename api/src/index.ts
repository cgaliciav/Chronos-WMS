import "./entorno"; // primero: carga .env antes de que otros módulos lean process.env (M34)
import "reflect-metadata";

import { crearApp } from "./app";
import { iniciarSentry } from "./sentry";
import { iniciarLimpiezaCache } from "./helpers/cacheArchivos";
import CorreoService from "./services/CorreoService";
import NotificacionService from "./services/NotificacionService";

import { AppDataSource, conectarORM } from "./data-source";
import { logger } from "./helpers/logger";

(async () => {
  logger.info("******PROCESO EN", process.env.NODE_ENV);
  if (!process.env.JWTSECRET || process.env.JWTSECRET.length < 32) {
    logger.error("JWTSECRET debe existir y tener al menos 32 caracteres. Abortando.");
    process.exit(1);
  }
  if (iniciarSentry()) logger.info("Sentry activo");
  await conectarORM();
  iniciarLimpiezaCache(); // caché de archivos (CACHE_ARCHIVOS_DIAS) y reportes (REPORTES_DIAS), hallazgo M17
  void CorreoService.verificar(); // informa del transporte (bd, anulado o entorno) y comprueba la conexión; no impide arrancar
  NotificacionService.iniciarTareas(); // préstamos vencidos (DIAS_CUARENTENA) y retención de 90 días (plan 02 · fase 7)

  const app = crearApp({ registrarPeticiones: true });

  const PUERTO_API = process.env.PORT_ALMACEN_API ? +process.env.PORT_ALMACEN_API : 8000;

  const http_server = app.listen(PUERTO_API, "0.0.0.0", () => {
    logger.info(`Express funcionando en el puerto ${PUERTO_API}. http://localhost:${PUERTO_API}/`);
  });
  http_server.on("error", (e) => {
    logger.error("Error del servidor HTTP:", e);
  });

  const cerrarOrdenadamente = async (senal: string) => {
    logger.info(`Señal ${senal} recibida: cerrando servidor HTTP`);
    if (http_server.listening) {
      http_server.close(() => {
        logger.info("Servidor HTTP cerrado");
      });
    }
    await closeDatabaseConnection();
    process.exit(0);
  };

  process.on("SIGTERM", () => cerrarOrdenadamente("SIGTERM"));
  process.on("SIGINT", () => cerrarOrdenadamente("SIGINT"));

})();

async function closeDatabaseConnection() {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info("Conexión a la base de datos cerrada");
  }
}
