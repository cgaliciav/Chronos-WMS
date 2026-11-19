/**
 * Proceso de reportes (decisión 27): genera UN reporte Excel fuera del proceso del API y termina.
 * Lo lanza `services/ReporteService` con `fork`, con el heap limitado (`--max-old-space-size`) y prioridad baja: si un
 * reporte pide más memoria de la permitida muere este proceso, no el API.
 *
 * Protocolo (IPC): recibe `{ tipo, body }`; responde `{ ok: true, archivo }` o `{ ok: false, mensaje }` y sale.
 */
import "./entorno";
import "reflect-metadata";
import { setPriority } from "os";
import sharp from "sharp";
import { AppDataSource, conectarORM } from "./data-source";
import { esTipoReporte, GENERADORES } from "./helpers/generadoresReporte";
import { logger } from "./helpers/logger";

// Una imagen a la vez y sin caché de libvips: el redimensionado de fotos no acumula memoria ni usa varios núcleos.
sharp.cache(false);
sharp.concurrency(1);
try {
  setPriority(19); // prioridad mínima: cede la CPU al API
} catch {
  // Sin permiso para cambiar la prioridad: se sigue con la normal.
}

const responder = (mensaje: object) => new Promise<void>((resolver) => (process.send ? process.send(mensaje, () => resolver()) : resolver()));

process.once("message", async (pedido: { tipo?: unknown; body?: unknown }) => {
  let codigo = 0;
  try {
    if (!esTipoReporte(pedido?.tipo)) throw new Error(`Tipo de reporte desconocido: ${String(pedido?.tipo)}`);
    await conectarORM();
    const archivo = await GENERADORES[pedido.tipo](pedido.body);
    const { rss, heapUsed } = process.memoryUsage();
    logger.info("Proceso de reportes: reporte generado", { tipo: pedido.tipo, archivo: archivo.nombreReporte, rssMb: Math.round(rss / 1048576), heapMb: Math.round(heapUsed / 1048576) });
    await responder({ ok: true, archivo });
  } catch (error) {
    codigo = 1;
    logger.error("Proceso de reportes: error al generar", { error });
    await responder({ ok: false, mensaje: (error as Error)?.message ?? String(error) });
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy().catch(() => undefined);
    process.exit(codigo);
  }
});

// Lanzado a mano (sin canal IPC) no hay nada que hacer.
if (!process.send) {
  logger.error("reporteProceso solo se ejecuta como proceso hijo del API");
  process.exit(2);
}
