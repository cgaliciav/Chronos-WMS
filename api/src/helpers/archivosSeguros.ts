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
