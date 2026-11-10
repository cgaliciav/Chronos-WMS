/**
 * Plan 02 · fase 5: recorre TODAS las rutas declaradas en src/routes con un token de administrador y comprueba que
 * Express las encuentra (ninguna responde el 404 propio de Express, "Cannot GET …"). Sirve para detectar rutas que
 * dejan de casar al cambiar la sintaxis de rutas (Express 5 / path-to-regexp 8). Los 404 del API (registro no
 * encontrado) llegan en JSON y sí son válidos: los parámetros usan un id que no existe para no tocar datos sembrados.
 */
import "./env";
import { Express } from "express";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import supertest from "supertest";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { SEMILLA } from "./seed";

const DIR_RUTAS = join(__dirname, "..", "routes");
const ID_INEXISTENTE = "999999";

interface Ruta {
  metodo: "get" | "post" | "put" | "delete";
  ruta: string;
}

/** Lee los montajes de routes/index.ts y las rutas de cada *.Routes.ts. */
const rutasDeclaradas = (): Ruta[] => {
  const indice = readFileSync(join(DIR_RUTAS, "index.ts"), "utf8");
  const archivoDe = new Map<string, string>(); // identificador importado → archivo
  for (const m of indice.matchAll(/^import (\w+) from "\.\/([\w.]+)"/gm)) archivoDe.set(m[1], m[2]);
  const rutas: Ruta[] = [];
  for (const m of indice.matchAll(/^routes\.(get|post|put|delete)\("([^"]+)"/gm)) rutas.push({ metodo: m[1] as Ruta["metodo"], ruta: m[2] });
  for (const m of indice.matchAll(/^routes\.use\("([^"]+)",\s*(\w+)\)/gm)) {
    const [, prefijo, identificador] = m;
    const archivo = archivoDe.get(identificador);
    if (!archivo) continue;
    const fuente = readFileSync(join(DIR_RUTAS, `${archivo}.ts`), "utf8");
    for (const r of fuente.matchAll(/^router\.(get|post|put|delete)\("([^"]+)"/gm)) {
      rutas.push({ metodo: r[1] as Ruta["metodo"], ruta: `${prefijo}${r[2] === "/" ? "" : r[2]}` });
    }
  }
  return rutas;
};

/** Sustituye cada parámetro (`:id`, `:id([0-9]+)`, `:id{…}`) por un valor concreto. */
const concretar = (ruta: string) => ruta.replace(/:(\w+)(\([^)]*\))?/g, ID_INEXISTENTE);

/** Rutas que no se llaman: logout cerraría la sesión del recorrido; stream (SSE) no termina nunca. */
const OMITIDAS = new Set(["post /auth/logout", "get /notifications/stream"]); // stream: SSE, la conexión no termina

describe("fase 5 · todas las rutas declaradas existen", () => {
  let app: Express;
  let token: string;
  const rutas = rutasDeclaradas();

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    // Sesión propia: si alguna ruta la afectara, no rompería las demás suites.
    const login = await supertest(app).post("/auth/login").send({ c: SEMILLA.adminCorreo, p: SEMILLA.adminPassword });
    token = login.body.t;
  });
  afterAll(cerrarPruebas);

  it("se encontraron las rutas de todos los archivos", () => {
    expect(rutas.length).toBeGreaterThan(130);
    expect(new Set(rutas.map((r) => r.ruta.split("/")[1])).size).toBeGreaterThan(20);
  });

  it("ninguna ruta responde el 404 de Express", async () => {
    const perdidas: string[] = [];
    const colgadas: string[] = []; // también es un fallo: el manejador nunca responde
    for (const { metodo, ruta } of rutas) {
      if (OMITIDAS.has(`${metodo} ${ruta}`)) continue;
      try {
        const res = await supertest(app)[metodo](concretar(ruta)).set("auth", token).send({}).timeout(10000);
        if (res.status === 404 && /Cannot (GET|POST|PUT|DELETE)/.test(res.text)) perdidas.push(`${metodo.toUpperCase()} ${ruta}`);
      } catch (error) {
        if ((error as { timeout?: number }).timeout) colgadas.push(`${metodo.toUpperCase()} ${ruta}`);
        else throw error;
      }
    }
    expect({ perdidas, colgadas }).toEqual({ perdidas: [], colgadas: [] });
  }, 300000);

  it("un id no numérico no casa con las rutas numéricas (como antes con `:id([0-9]+)`)", async () => {
    const res = await supertest(app).get("/groups/abc").set("auth", token);
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Cannot GET/);
  });
});

// Archivo de rutas sin montar en index.ts: aviso temprano si alguien añade uno y olvida montarlo.
test("todos los *.Routes.ts están montados en routes/index.ts", () => {
  const indice = readFileSync(join(DIR_RUTAS, "index.ts"), "utf8");
  const sinMontar = readdirSync(DIR_RUTAS)
    .filter((a) => a.endsWith(".Routes.ts"))
    .filter((a) => !indice.includes(`"./${a.replace(/\.ts$/, "")}"`));
  expect(sinMontar).toEqual([]);
});
