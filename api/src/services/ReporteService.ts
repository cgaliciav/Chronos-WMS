/**
 * Generación de reportes Excel (decisión 27):
 *  - **Cola**: un solo reporte a la vez (`ColaEnSerie`); los demás esperan su turno.
 *  - **Proceso aparte**: cada reporte se genera en un proceso hijo (`src/reporteProceso.ts`) con el heap limitado
 *    (`REPORTES_MEMORIA_MB`), prioridad mínima, un solo hilo de trabajo y un tiempo máximo (`REPORTES_MINUTOS_MAX`).
 *    Si el reporte se pasa de memoria o de tiempo muere ese proceso; el API sigue atendiendo.
 *  - `REPORTES_PROCESO=interno` lo genera dentro del API (pruebas, o como salida de emergencia).
 */
import { fork } from "child_process";
import { extname, join } from "path";
import { ArchivoReporte, GENERADORES, TipoReporte } from "../helpers/generadoresReporte";
import { logger } from "../helpers/logger";
import { ColaEnSerie } from "./reglas/colaEnSerie";

const entero = (valor: string | undefined, porDefecto: number, minimo: number) => {
  const n = Number(valor);
  return Number.isFinite(n) && n >= minimo ? Math.floor(n) : porDefecto;
};

/** Límite del heap del proceso de reportes, en MiB. */
export const memoriaReportesMb = () => entero(process.env.REPORTES_MEMORIA_MB, 768, 32);
/** Tiempo máximo de un reporte, en minutos. */
export const minutosMaximosReporte = () => entero(process.env.REPORTES_MINUTOS_MAX, 30, 1);
const enProcesoAparte = () => (process.env.REPORTES_PROCESO ?? "hijo") !== "interno";

const cola = new ColaEnSerie((error) => logger.error("Cola de reportes: trabajo fallido", { error }));

/** Genera el reporte en un proceso hijo limitado y devuelve el archivo. Rechaza con un mensaje para el usuario. */
const generarEnProcesoHijo = (tipo: TipoReporte, body: unknown): Promise<ArchivoReporte> =>
  new Promise((resolver, rechazar) => {
    // Mismo tipo de archivo que este módulo: `.js` compilado en producción, `.ts` con ts-node en desarrollo y pruebas.
    const extension = extname(__filename);
    const memoria = memoriaReportesMb();
    const hijo = fork(join(__dirname, "..", `reporteProceso${extension}`), [], {
      execArgv: [`--max-old-space-size=${memoria}`, ...(extension === ".ts" ? ["-r", "ts-node/register"] : [])],
      env: { ...process.env, UV_THREADPOOL_SIZE: "2", ...(extension === ".ts" ? { TS_NODE_TRANSPILE_ONLY: "true" } : {}) },
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });
    let resuelto = false;
    const terminar = (accion: () => void) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(limite);
      accion();
    };
    const minutos = minutosMaximosReporte();
    const limite = setTimeout(() => {
      terminar(() => rechazar(new Error(`El reporte tardó más de ${minutos} minutos y se canceló. Acota la búsqueda (menos artículos o sin fotos) e inténtalo de nuevo.`)));
      hijo.kill("SIGKILL");
    }, minutos * 60_000);

    hijo.once("message", (respuesta: { ok: boolean; archivo?: ArchivoReporte; mensaje?: string }) => {
      if (respuesta.ok && respuesta.archivo) terminar(() => resolver(respuesta.archivo as ArchivoReporte));
      else terminar(() => rechazar(new Error(respuesta.mensaje ?? "Error al generar el reporte")));
    });
    hijo.once("error", (error) => terminar(() => rechazar(error)));
    hijo.once("exit", (codigo, senal) => {
      // Terminó sin responder: lo habitual es que V8 abortara por quedarse sin heap (SIGABRT, código 134).
      terminar(() =>
        rechazar(
          new Error(
            `El reporte necesitó más recursos de los permitidos (${memoria} MB) y se canceló (${senal ?? `código ${codigo}`}). Acota la búsqueda (menos artículos o sin fotos) e inténtalo de nuevo.`
          )
        )
      );
    });
    hijo.send({ tipo, body });
  });

export default class ReporteService {
  /** Genera un reporte ahora mismo (sin cola): en el proceso hijo o, con `REPORTES_PROCESO=interno`, aquí. */
  static generar = (tipo: TipoReporte, body: unknown): Promise<ArchivoReporte> =>
    enProcesoAparte() ? generarEnProcesoHijo(tipo, body) : GENERADORES[tipo](body);

  /** Reportes que hay por delante de uno que se pidiera ahora (el que se está generando cuenta). */
  static get porDelante() {
    return cola.porDelante;
  }

  /**
   * Encola `trabajo` (que debe encargarse de sus errores) y devuelve cuántos reportes tenía por delante.
   * Solo se genera un reporte a la vez.
   */
  static encolar = (trabajo: () => Promise<void>) => cola.encolar(trabajo);
}
