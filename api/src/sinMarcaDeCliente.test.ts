import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Plan 03, fase 0: la identidad de un cliente no vive en el código. Falla si aparece "Sony" o "Teleset" en `src/`
 * fuera de pruebas y migraciones (las migraciones publicadas no se modifican). Única excepción documentada: el logo
 * histórico de los reportes (`LOGO_HISTORICO`), alternativa temporal que se retira en la fase 5.
 */
const RAIZ = join(__dirname);
// Palabra completa: el base64 de las imágenes de src/recursos puede contener esas letras por casualidad
const MARCA_DE_CLIENTE = /\b(sony|teleset)\b/i;
const EXCEPCION = /^const LOGO_HISTORICO = "sony-tv-logo\.jpg";$/;

const archivos = (directorio: string): string[] =>
  readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });

test("src/ no menciona a Sony ni a Teleset (salvo el logo histórico temporal)", () => {
  const revisados = archivos(RAIZ).filter(
    (ruta) => ruta.endsWith(".ts") && !/\.test\.ts$/.test(ruta) && !/[\\/](test|migration)[\\/]/.test(relative(RAIZ, ruta))
  );
  expect(revisados.length).toBeGreaterThan(100);
  const conMarca = revisados.flatMap((ruta) =>
    readFileSync(ruta, "utf8")
      .split(/\r?\n/)
      .filter((linea) => MARCA_DE_CLIENTE.test(linea) && !EXCEPCION.test(linea.trim()))
      .map((linea) => `${relative(RAIZ, ruta)}: ${linea.trim()}`)
  );
  expect(conMarca).toEqual([]);
});
