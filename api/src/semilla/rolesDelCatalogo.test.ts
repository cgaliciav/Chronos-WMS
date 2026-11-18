import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import catalogo from "./catalogo.json";

/**
 * Todo código de rol que exige una ruta del API (`checkRole`) o una pantalla del front (`<ACL roles>`, menú,
 * `tieneAlgunRol`) debe existir en el catálogo de carga inicial. Si falta, en una base nueva solo el ADMINISTRADOR
 * puede usar esa ruta o pantalla (hallazgo F23; pasó con 102 roles en la base de AMZ).
 *
 * Al añadir un rol: agrégalo a `catalogo.json` y créalo en una migración para las bases existentes.
 */
const RAIZ_API = join(__dirname, "..");
const RAIZ_FRONT = join(__dirname, "..", "..", "..", "front", "src");

/** Roles que no están en el catálogo porque los crea una migración (existen en toda base migrada). */
const CREADOS_POR_MIGRACION = ["CONFIGURACION-EDITAR"];

const archivos = (directorio: string): string[] =>
  readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });

const codigos = (texto: string, comilla: string) =>
  [...texto.matchAll(new RegExp(`${comilla}([A-Z0-9][A-Z0-9-]+)${comilla}`, "g"))].map((m) => m[1]);

const enCatalogo = new Set([...catalogo.rol.map((r) => r.codigoRol), ...CREADOS_POR_MIGRACION]);

test("el catálogo no repite códigos ni nombres de rol", () => {
  expect(new Set(catalogo.rol.map((r) => r.codigoRol)).size).toBe(catalogo.rol.length);
  expect(new Set(catalogo.rol.map((r) => r.nombre)).size).toBe(catalogo.rol.length);
  expect(catalogo.rol.filter((r) => r.codigoRol.length > 60)).toEqual([]);
});

test("todos los roles de las rutas del API están en el catálogo", () => {
  const usados = new Set<string>();
  for (const ruta of archivos(join(RAIZ_API, "routes")).filter((r) => r.endsWith(".ts"))) {
    for (const m of readFileSync(ruta, "utf8").matchAll(/checkRole\(\[([\s\S]*?)\]\)/g)) {
      codigos(m[1], '"').forEach((c) => usados.add(c));
    }
  }
  expect(usados.size).toBeGreaterThan(100);
  expect([...usados].filter((c) => !enCatalogo.has(c)).sort()).toEqual([]);
});

// La imagen del API no incluye el front: allí esta comprobación no aplica.
(existsSync(RAIZ_FRONT) ? test : test.skip)("todos los roles que usa el front (ACL, menú) están en el catálogo", () => {
  const usados = new Set<string>();
  const fuentes = archivos(RAIZ_FRONT).filter((r) => /\.tsx?$/.test(r) && !/\.test\.tsx?$/.test(r) && !/[\\/]test[\\/]/.test(r));
  for (const ruta of fuentes) {
    const texto = readFileSync(ruta, "utf8");
    for (const patron of [/roles=\{\[([\s\S]*?)\]\}/g, /tieneAlgunRol\(\[([\s\S]*?)\]/g]) {
      for (const m of texto.matchAll(patron)) codigos(m[1], "'").forEach((c) => usados.add(c));
    }
    for (const m of texto.matchAll(/role: '([A-Z0-9][A-Z0-9-]+)'/g)) usados.add(m[1]);
  }
  expect(usados.size).toBeGreaterThan(100);
  expect([...usados].filter((c) => !enCatalogo.has(c)).sort()).toEqual([]);
});
