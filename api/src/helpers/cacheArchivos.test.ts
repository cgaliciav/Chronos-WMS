import { mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { escribirAtomico, limpiarDirectorio, olvidarArchivoEnCache } from "./cacheArchivos";

const directorio = () => mkdtempSync(join(tmpdir(), "cache-"));
const DIA = 24 * 60 * 60 * 1000;

describe("cacheArchivos", () => {
  it("escribirAtomico deja el archivo completo y sin temporales", async () => {
    const dir = directorio();
    await Promise.all([escribirAtomico(join(dir, "1.png"), "a".repeat(1000)), escribirAtomico(join(dir, "1.png"), "a".repeat(1000))]);
    expect(readFileSync(join(dir, "1.png"), "utf8")).toHaveLength(1000);
    expect(readdirSync(dir)).toEqual(["1.png"]);
  });

  it("limpiarDirectorio borra solo lo más viejo que el límite y tolera un directorio inexistente", async () => {
    const dir = directorio();
    writeFileSync(join(dir, "viejo.png"), "x");
    writeFileSync(join(dir, "nuevo.png"), "x");
    const hace40dias = (Date.now() - 40 * DIA) / 1000;
    utimesSync(join(dir, "viejo.png"), hace40dias, hace40dias);
    expect(await limpiarDirectorio(dir, 30 * DIA)).toBe(1);
    expect(readdirSync(dir)).toEqual(["nuevo.png"]);
    expect(await limpiarDirectorio(join(dir, "no-existe"), DIA)).toBe(0);
  });

  it("olvidarArchivoEnCache borra el original y sus miniaturas, y no toca ids que solo comparten prefijo", async () => {
    const dir = directorio();
    for (const n of ["7.png", "7.png-thumbnail", "7.png-catalog", "70.png", "17.png"]) writeFileSync(join(dir, n), "x");
    await olvidarArchivoEnCache(dir, 7);
    expect(readdirSync(dir).sort()).toEqual(["17.png", "70.png"]);
    await expect(olvidarArchivoEnCache(undefined, 7)).resolves.toBeUndefined();
  });
});
