import { readFileSync } from "fs";
import { join } from "path";

/**
 * Nombre y versión de package.json leídos en tiempo de ejecución. Antes se importaba el JSON, lo que hacía que `tsc`
 * copiara package.json dentro de build/ y cambiara la estructura de salida (build/src/...). Desde src/helpers y desde
 * build/helpers, package.json está dos niveles arriba.
 */
const datos = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")) as { name: string; version: string };

export const nombrePaquete = datos.name;
export const versionPaquete = datos.version;
