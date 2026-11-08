import express from "express";
import helmet from "helmet";
import cors from "cors";
import routes from "./routes";
import { errorMiddlewere } from "./middlewares/manejoErrores";
import { pasadas } from "./middlewares/pasada";
import { registrarPeticiones } from "./middlewares/registrarPeticiones";
import pinoHttp from "pino-http";
import { pinoBase } from "./helpers/logger";
import rateLimit from "express-rate-limit";
import { Sentry, sentryActivo } from "./sentry";

/**
 * Construye la aplicación Express sin arrancar el servidor ni conectar la base de datos.
 * `src/index.ts` la usa para producción; las pruebas de integración la usan con supertest.
 */
export const crearApp = (opciones: { registrarPeticiones?: boolean } = {}) => {
  const app = express();
  if (opciones.registrarPeticiones) {
    // Solo en index.ts: una línea por petición en el log (pino-http) y una fila en LogPeticiones.
    app.use(
      pinoHttp({
        logger: pinoBase,
        redact: ["req.headers.auth", "req.headers.authorization", "req.headers.cookie", "res.headers.t"],
        customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
      })
    );
    app.use(registrarPeticiones);
  }

  // IP real del cliente detrás del proxy inverso (nginx/docker). TRUST_PROXY admite los valores de Express:
  // "loopback" (por defecto), "loopback, 172.18.0.0/16", un número de saltos, "true"...
  const trustProxy = process.env.TRUST_PROXY ?? "loopback";
  app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === "true" ? true : trustProxy);

  app.use(cors());
  app.use(helmet());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(pasadas);

  // Límite de intentos de inicio de sesión por IP (hallazgo M3).
  app.use(
    "/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: Number(process.env.LOGIN_MAX_INTENTOS ?? 20),
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { code: "Demasiados intentos", message: "Demasiados intentos de inicio de sesión. Intenta más tarde." },
    })
  );

  app.use("/", routes);

  if (sentryActivo()) {
    Sentry.setupExpressErrorHandler(app);
  }

  // El manejador de errores va después de todas las rutas.
  app.use(errorMiddlewere);

  return app;
};
