import * as Sentry from "@sentry/node";
import { versionPaquete as version } from "./helpers/paquete";

/**
 * Opciones de Sentry a partir del entorno, o `null` si no hay SENTRY_DSN (Sentry queda PREPARADO: solo se inicializa
 * con DSN). Variables: SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE (0..1, por defecto 0), SENTRY_ENVIRONMENT (por ejemplo
 * `staging` o `produccion`; si falta, NODE_ENV como environment) y CLIENTE (por ejemplo `amz`), que se envía como etiqueta
 * `cliente` para separar los eventos de cada cliente.
 */
export const opcionesSentry = (env: NodeJS.ProcessEnv, version: string): Sentry.NodeOptions | null => {
  const dsn = env.SENTRY_DSN;
  if (!dsn) return null;
  const cliente = env.CLIENTE;
  return {
    dsn,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || "development",
    release: `almacen-api@${version}`,
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    ...(cliente ? { initialScope: { tags: { cliente } } } : {}),
  };
};

/** Inicializa Sentry si hay SENTRY_DSN. Debe llamarse antes de crear la app. */
export const iniciarSentry = () => {
  const opciones = opcionesSentry(process.env, version);
  if (!opciones) return false;
  Sentry.init(opciones);
  return true;
};

export const sentryActivo = () => Boolean(process.env.SENTRY_DSN);

export { Sentry };
