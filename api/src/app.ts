import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import cors from "cors";
import routes from "./routes";
import { errorMiddlewere } from "./middlewares/manejoErrores";
import { pasadas } from "./middlewares/pasada";

/**
 * Construye la aplicación Express sin arrancar el servidor ni conectar la base de datos.
 * `src/index.ts` la usa para producción; las pruebas de integración la usan con supertest.
 */
export const crearApp = () => {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(pasadas);

  app.use("/", routes);

  // El manejador de errores va después de todas las rutas.
  app.use(errorMiddlewere);

  return app;
};
