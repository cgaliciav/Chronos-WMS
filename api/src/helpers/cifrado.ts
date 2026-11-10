/**
 * Cifrado de secretos guardados en la BD (plan 03 §2.3): AES-256-GCM con la clave `CONFIG_CLAVE` (32 bytes en
 * base64, en el entorno del servidor, nunca en la BD). Formato: `v1:<iv>:<etiqueta>:<cifrado>` en base64.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { AppError } from "./errorClases";

const PREFIJO = "v1";

/** La clave de `CONFIG_CLAVE`, o `null` si falta o no mide 32 bytes. */
export const claveConfiguracion = (valor = process.env.CONFIG_CLAVE): Buffer | null => {
  if (!valor) return null;
  const clave = Buffer.from(valor, "base64");
  return clave.length === 32 ? clave : null;
};

export const cifrar = (texto: string, clave = claveConfiguracion()): string => {
  if (!clave) {
    throw new AppError("No se pueden guardar contraseñas: falta CONFIG_CLAVE (32 bytes en base64) en el servidor", 400);
  }
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", clave, iv);
  const cifrado = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return [PREFIJO, iv.toString("base64"), cifrador.getAuthTag().toString("base64"), cifrado.toString("base64")].join(":");
};

/** Descifra; `null` si no hay clave o el texto no es válido (clave distinta, manipulado…). */
export const descifrar = (sobre: string, clave = claveConfiguracion()): string | null => {
  const [prefijo, iv, etiqueta, cifrado] = sobre.split(":");
  if (!clave || prefijo !== PREFIJO || !iv || !etiqueta || !cifrado) return null;
  try {
    const descifrador = createDecipheriv("aes-256-gcm", clave, Buffer.from(iv, "base64"));
    descifrador.setAuthTag(Buffer.from(etiqueta, "base64"));
    return Buffer.concat([descifrador.update(Buffer.from(cifrado, "base64")), descifrador.final()]).toString("utf8");
  } catch {
    return null;
  }
};
