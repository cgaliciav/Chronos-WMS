/**
 * Caché en disco de archivos y reportes (hallazgo M17, pendiente de la fase 2).
 *  - `escribirAtomico`: escribe en un temporal y renombra, para que dos peticiones simultáneas nunca sirvan un
 *    archivo a medio escribir (antes `existsSync` + `writeFile` competían).
 *  - `limpiarDirectorio`: borra lo que lleva más de N días sin modificarse. Los archivos de RUTA_ARCHIVOS se
 *    regeneran desde el BLOB al pedirse de nuevo; los reportes se avisan por correo y caducan.
 *  - `iniciarLimpiezaCache`: tarea periódica (cada 6 h y al arrancar) que llama `src/index.ts`, no la app de pruebas.
 */
import { randomBytes } from "crypto";
import { readdir, rename, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { logger } from "./logger";

const DIA_MS = 24 * 60 * 60 * 1000;

export const escribirAtomico = async (ruta: string, datos: Buffer | string) => {
  const temporal = `${ruta}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporal, datos);
  await rename(temporal, ruta);
};

/** Ruta temporal hermana para herramientas que escriben por su cuenta (sharp.toFile); renombra con `rename`. */
export const rutaTemporal = (ruta: string) => `${ruta}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;

/** Borra los archivos (no carpetas) de `directorio` modificados hace más de `maxEdadMs`. Devuelve cuántos borró. */
export const limpiarDirectorio = async (directorio: string | undefined, maxEdadMs: number, ahora = Date.now()) => {
  let borrados = 0;
  if (!directorio) return 0;
  let nombres: string[];
  try {
    nombres = await readdir(directorio);
  } catch {
    return 0; // el directorio aún no existe
  }
  for (const nombre of nombres) {
    const ruta = join(directorio, nombre);
    try {
      const info = await stat(ruta);
      if (info.isFile() && ahora - info.mtimeMs > maxEdadMs) {
        await unlink(ruta);
        borrados++;
      }
    } catch {
      // otro proceso lo borró o lo está renombrando: se ignora
    }
  }
  return borrados;
};

/** Borra del caché las copias de un archivo (original y miniaturas `<id>.<ext>[-thumbnail|-catalog|-review]`). */
export const olvidarArchivoEnCache = async (directorio: string | undefined, archivoId: number) => {
  if (!directorio) return;
  let nombres: string[] = [];
  try {
    nombres = await readdir(directorio);
  } catch {
    return;
  }
  const prefijo = new RegExp(`^${archivoId}(\\.|-|$)`);
  await Promise.all(nombres.filter((n) => prefijo.test(n)).map((n) => unlink(join(directorio, n)).catch(() => undefined)));
};

const dias = (variable: string, porDefecto: number) => {
  const valor = Number(process.env[variable]);
  return (Number.isFinite(valor) && valor > 0 ? valor : porDefecto) * DIA_MS;
};

export const iniciarLimpiezaCache = () => {
  const limpiar = async () => {
    const archivos = await limpiarDirectorio(process.env.RUTA_ARCHIVOS, dias("CACHE_ARCHIVOS_DIAS", 30));
    const reportes = await limpiarDirectorio(process.env.RUTA_REPORTES, dias("REPORTES_DIAS", 15));
    if (archivos + reportes > 0) logger.info(`Limpieza de caché: ${archivos} archivos y ${reportes} reportes borrados`);
  };
  void limpiar();
  const temporizador = setInterval(() => void limpiar(), 6 * 60 * 60 * 1000);
  temporizador.unref();
  return temporizador;
};
