import { basename, extname } from "path";
import { AppError } from "./errorClases";

/**
 * Nombre de archivo seguro para guardar en disco: solo el nombre base (sin directorios), sin caracteres
 * raros y sin `..`. Lanza 400 si tras limpiar no queda nada.
 */
export const nombreArchivoSeguro = (nombre: unknown): string => {
  if (typeof nombre !== "string") throw new AppError("Nombre de archivo inválido", 400);
  let decodificado = nombre;
  try {
    decodificado = decodeURIComponent(nombre); // por si llega codificado (..%2F..%2F)
  } catch {
    /* se usa tal cual */
  }
  const base = basename(decodificado.replace(/\\/g, "/")).replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
  if (base.length === 0 || base === "." || base === "..") throw new AppError("Nombre de archivo inválido", 400);
  return base;
};

/**
 * Nombre de un reporte ya generado por el propio API (`GET /file/report/:nombre`): solo el nombre base, sin
 * directorios, sin archivos ocultos ni caracteres de control, pero SIN sustituir caracteres. Los reportes llevan
 * espacios y acentos ("Alta Proyecto A_123.xlsx"); con `nombreArchivoSeguro` el nombre cambiaba y la descarga daba
 * 404 (plan 02 · fase 7). El recorrido de rutas lo impiden `basename` y el `root` de `sendFile`.
 */
export const nombreReporteSeguro = (nombre: unknown): string => {
  if (typeof nombre !== "string") throw new AppError("Nombre de reporte inválido", 400);
  let decodificado = nombre;
  try {
    decodificado = decodeURIComponent(nombre);
  } catch {
    /* se usa tal cual */
  }
  const base = basename(decodificado.replace(/\\/g, "/"));
  if (base.length === 0 || base.startsWith(".") || /[\u0000-\u001f\u007f]/.test(base)) {
    throw new AppError("Nombre de reporte inválido", 400);
  }
  return base;
};

const EXTENSIONES_POR_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

/** Extensión a partir del tipo MIME o, si no se conoce, del nombre original (ya saneada). */
export const extensionSegura = (tipoMIME: string | undefined, nombreOriginal: string | undefined): string => {
  if (tipoMIME && EXTENSIONES_POR_MIME[tipoMIME.toLowerCase()]) return EXTENSIONES_POR_MIME[tipoMIME.toLowerCase()];
  const ext = extname(nombreOriginal ?? "").toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
};

export const esImagen = (tipoMIME: string | undefined) => (tipoMIME ?? "").toLowerCase().startsWith("image/");
