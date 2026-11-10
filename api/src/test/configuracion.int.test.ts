/**
 * Plan 03 · fase 1: configuración por cliente (`/config`). Lo público sin token y sin secretos; lo administrativo con
 * rol; validación, bloqueo optimista, contraseña SMTP cifrada que nunca sale (ni en la auditoría), imágenes de marca y
 * valores por defecto si la tabla está vacía o rota.
 */
import "./env";
import { randomBytes } from "crypto";
import { Express } from "express";
import sharp from "sharp";
import supertest from "supertest";
import { crearApp } from "../app";
import { AppDataSource } from "../data-source";
import ConfiguracionService from "../services/ConfiguracionService";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, clienteOperador } from "./factories";

const esperarHasta = async <T>(fn: () => Promise<T>, condicion: (v: T) => boolean, ms = 5000) => {
  const inicio = Date.now();
  let valor = await fn();
  while (!condicion(valor) && Date.now() - inicio < ms) {
    await new Promise((r) => setTimeout(r, 100));
    valor = await fn();
  }
  return valor;
};

describe("plan 03 · fase 1 · /config", () => {
  let app: Express;
  let admin: ReturnType<typeof clienteAdmin>;
  const claveAnterior = process.env.CONFIG_CLAVE;

  const seccion = async (nombre: string) => (await admin.get("/config")).body[nombre] as { valor: any; version: number };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    admin = clienteAdmin(app);
    ConfiguracionService.olvidarCache();
  });
  afterAll(async () => {
    process.env.CONFIG_CLAVE = claveAnterior;
    await cerrarPruebas();
  });

  it("GET /config/public sin token: marca y regional de Chronos WMS, sin correo, con ETag y 304", async () => {
    const res = await supertest(app).get("/config/public");
    expect(res.status).toBe(200);
    expect(res.body.marca).toMatchObject({ nombreApp: "Chronos WMS", tema: { colorPrimario: "#4b7cf3" } });
    expect(res.body.regional).toMatchObject({ monedaPorDefecto: "MXN" });
    expect(res.body).not.toHaveProperty("correo");
    expect(res.headers["cache-control"]).toBe("no-cache");
    const revalidada = await supertest(app).get("/config/public").set("If-None-Match", res.headers.etag);
    expect(revalidada.status).toBe(304);

    const logo = await supertest(app).get("/config/public/logo");
    expect(logo.status).toBe(200);
    expect(logo.headers["content-type"]).toMatch(/image\/png/);
    expect(logo.headers["content-security-policy"]).toBe("default-src 'none'");
  });

  it("lo administrativo exige token y rol", async () => {
    expect((await supertest(app).get("/config")).status).toBe(401);
    expect((await clienteOperador(app).get("/config")).status).toBe(401);
    const todas = (await admin.get("/config")).body;
    expect(Object.keys(todas).sort()).toEqual(["correo", "marca", "regional", "reportes"]);
    expect(todas.marca.version).toBeGreaterThanOrEqual(1);
  });

  it("PUT valida con el esquema (400), exige la versión y detecta conflictos (409)", async () => {
    const { valor, version } = await seccion("marca");
    const extra = await admin.put("/config/marca").send({ version, valor: { ...valor, sobra: 1 } });
    expect(extra.status).toBe(400);
    expect(extra.body.errores).toEqual(expect.arrayContaining([expect.objectContaining({ mensaje: expect.any(String) })]));
    expect((await admin.put("/config/marca").send({ valor })).status).toBe(400);
    expect((await admin.put("/config/inexistente").send({ version: 1, valor: {} })).status).toBe(404);

    const ok = await admin.put("/config/marca").send({ version, valor: { ...valor, nombreApp: "Almacén Demo", organizacion: "Demo S.A." } });
    expect(ok.status).toBe(200);
    expect(ok.body.version).toBe(version + 1);
    const conflicto = await admin.put("/config/marca").send({ version, valor });
    expect(conflicto.status).toBe(409);
    expect(conflicto.body.version).toBe(version + 1);

    expect((await supertest(app).get("/config/public")).body.marca).toMatchObject({ nombreApp: "Almacén Demo", organizacion: "Demo S.A." });
    // Se restaura para las demás suites
    expect((await admin.put("/config/marca").send({ version: version + 1, valor })).status).toBe(200);
  });

  it("la contraseña SMTP se guarda cifrada, nunca sale (ni en la auditoría) y es solo de escritura", async () => {
    const transporte = { host: "smtp.ejemplo.io", puerto: 587, seguro: false, usuario: "envios", contrasena: "SecretoSMTP-123" };
    let { valor, version } = await seccion("correo");

    delete process.env.CONFIG_CLAVE;
    const sinClave = await admin.put("/config/correo").send({ version, valor: { ...valor, transporte } });
    expect(sinClave.status).toBe(400);
    expect(sinClave.body.message).toMatch(/CONFIG_CLAVE/);

    process.env.CONFIG_CLAVE = randomBytes(32).toString("base64");
    const guardada = await admin.put("/config/correo").send({ version, valor: { ...valor, transporte } });
    expect(guardada.status).toBe(200);
    expect(guardada.body.valor.transporte).toEqual({ host: "smtp.ejemplo.io", puerto: 587, seguro: false, usuario: "envios", tieneContrasena: true });
    for (const cuerpo of [JSON.stringify(guardada.body), JSON.stringify((await admin.get("/config")).body)]) {
      expect(cuerpo).not.toContain("SecretoSMTP");
      expect(cuerpo).not.toContain("contrasenaCifrada");
    }
    const [fila] = await AppDataSource.query("SELECT valor FROM configuracion WHERE seccion = 'correo'");
    expect(fila.valor).not.toContain("SecretoSMTP");
    expect(JSON.parse(fila.valor).transporte.contrasenaCifrada).toMatch(/^v1:/);
    ConfiguracionService.olvidarCache();
    expect(await ConfiguracionService.contrasenaSmtp()).toBe("SecretoSMTP-123");

    const [auditoria] = await esperarHasta(
      () => AppDataSource.query("SELECT data FROM log_funcionamiento WHERE entidadOrigen = 'Configuracion' AND data LIKE '%smtp.ejemplo.io%' ORDER BY id DESC LIMIT 1"),
      (filas: unknown[]) => filas.length > 0
    );
    expect(auditoria.data).toContain('"contrasenaCifrada":"***"');
    expect(auditoria.data).not.toContain("v1:");

    // Sin `contrasena` se conserva; con null se borra
    ({ valor, version } = guardada.body);
    const { tieneContrasena: _t, ...sinMarca } = valor.transporte;
    const conserva = await admin.put("/config/correo").send({ version, valor: { ...valor, transporte: sinMarca } });
    expect(conserva.body.valor.transporte.tieneContrasena).toBe(true);
    const borra = await admin.put("/config/correo").send({ version: conserva.body.version, valor: { ...valor, transporte: { ...sinMarca, contrasena: null } } });
    expect(borra.body.valor.transporte.tieneContrasena).toBe(false);
    // Se deja sin transporte (usa SMTP_* del entorno) para las demás suites
    expect((await admin.put("/config/correo").send({ version: borra.body.version, valor: { ...valor, transporte: null } })).status).toBe(200);
  });

  it("imágenes de marca: PNG/JPEG normalizados y servidos sin token; SVG y archivos que no son imagen, 400", async () => {
    const png = await sharp({ create: { width: 900, height: 300, channels: 3, background: "#123456" } }).png().toBuffer();
    const subida = await admin.post("/config/marca/logo").attach("file", png, "logo.png");
    expect(subida.status).toBe(200);
    const logoId = subida.body.valor.logoId;
    expect(logoId).toEqual(expect.any(Number));

    const publica = (await supertest(app).get("/config/public")).body;
    expect(publica.logoUrl).toBe(`/config/public/logo?v=${logoId}`);
    expect(publica.marca).not.toHaveProperty("logoId");
    const servida = await supertest(app).get("/config/public/logo").buffer(true);
    const meta = await sharp(servida.body).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["png", 512, 171]);

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await admin.post("/config/marca/logo").attach("file", svg, { filename: "x.svg", contentType: "image/svg+xml" })).status).toBe(400);
    expect((await admin.post("/config/marca/logo").attach("file", Buffer.from("no soy imagen"), { filename: "x.png", contentType: "image/png" })).status).toBe(400);
    expect((await admin.post("/config/marca/favicon")).status).toBe(400);

    // Al reemplazar, el archivo anterior se borra
    const otra = await admin.post("/config/marca/logo").attach("file", png, "logo2.png");
    expect(otra.body.valor.logoId).not.toBe(logoId);
    expect(await AppDataSource.query("SELECT id FROM archivo WHERE id = ?", [logoId])).toEqual([]);
    const reportes = await admin.post("/config/reportes/logo").attach("file", png, "reportes.png");
    expect(reportes.body.valor.logoId).toEqual(expect.any(Number));
  });

  it("sin fila o con una fila rota se usan los valores por defecto (la app no se rompe)", async () => {
    const [respaldo] = await AppDataSource.query("SELECT valor, version FROM configuracion WHERE seccion = 'regional'");
    try {
      await AppDataSource.query("DELETE FROM configuracion WHERE seccion = 'regional'");
      ConfiguracionService.olvidarCache();
      const sinFila = (await supertest(app).get("/config/public")).body;
      expect(sinFila.regional.monedaPorDefecto).toBe("MXN");
      expect(sinFila.version).toMatch(/-r0-/);

      await AppDataSource.query("INSERT INTO configuracion (seccion, valor, esquema, version) VALUES ('regional', '{\"monedaPorDefecto\": 7}', 1, 9)");
      ConfiguracionService.olvidarCache();
      expect((await supertest(app).get("/config/public")).body.regional.monedas).toEqual(["MXN", "USD"]);
    } finally {
      await AppDataSource.query("DELETE FROM configuracion WHERE seccion = 'regional'");
      await AppDataSource.query("INSERT INTO configuracion (seccion, valor, esquema, version) VALUES ('regional', ?, 1, ?)", [respaldo.valor, respaldo.version]);
      ConfiguracionService.olvidarCache();
    }
  });
});
