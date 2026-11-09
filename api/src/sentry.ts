import * as Sentry from "@sentry/node";
import { versionPaquete as version } from "./helpers/paquete";

/**
 * Sentry queda PREPARADO: solo se inicializa si existe SENTRY_DSN. Debe llamarse antes de crear la app.
 * Variables: SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE (0..1, por defecto 0), NODE_ENV como environment.
 */
export const iniciarSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: `almacen-api@${version}`,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  return true;
};

export const sentryActivo = () => Boolean(process.env.SENTRY_DSN);

export { Sentry };
