/**
 * Registro de la aplicación con pino (plan 02 fase 4; sustituye a console.*). Escribe JSON en stdout.
 *
 * Nivel: LOG_NIVEL (trace, debug, info, warn, error, fatal, silent) o, si no existe, el más detallado que aparezca en
 * LOG_CONSOLE_VERBOSE (la variable que ya usaba LogGeneral: "error", "warn,info", "debug"…). Por defecto `info`;
 * en pruebas (NODE_ENV=test) `silent`.
 *
 * Acepta la misma forma que console (`logger.info("texto", objeto, error)`): los argumentos se formatean con
 * util.format y un Error se serializa en `err` con su pila.
 */
import pino, { Level } from "pino";
import { format } from "util";

const NIVELES: Level[] = ["trace", "debug", "info", "warn", "error", "fatal"];

export const nivelDesdeEntorno = (entorno: NodeJS.ProcessEnv = process.env): Level | "silent" => {
  const explicito = entorno.LOG_NIVEL?.trim().toLowerCase();
  if (explicito && (explicito === "silent" || NIVELES.includes(explicito as Level))) return explicito as Level | "silent";
  if (entorno.NODE_ENV === "test") return "silent";
  const verbose = (entorno.LOG_CONSOLE_VERBOSE ?? "").toLowerCase();
  if (/silly|debug/.test(verbose)) return "debug";
  if (/info/.test(verbose)) return "info";
  if (/warn/.test(verbose)) return "warn";
  if (/error/.test(verbose)) return "error";
  return "info";
};

export const pinoBase = pino({ level: nivelDesdeEntorno(), base: { app: "almacen-api" } });

const emitir = (nivel: Level) => (...args: unknown[]) => {
  if (!pinoBase.isLevelEnabled(nivel)) return;
  const err = args.find((a) => a instanceof Error) as Error | undefined;
  const texto = format(...args.filter((a) => a !== err));
  if (err) pinoBase[nivel]({ err }, texto);
  else pinoBase[nivel](texto);
};

export const logger = {
  debug: emitir("debug"),
  info: emitir("info"),
  warn: emitir("warn"),
  error: emitir("error"),
};
