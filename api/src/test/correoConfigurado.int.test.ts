/**
 * Plan 03 · fase 2: el correo y el logo de los reportes salen de la configuración. Los mensajes se capturan con un
 * transporte simulado (`CorreoService.fabrica`); `SMTP_ANULAR` de .env.test evita cualquier servidor real.
 */
import "./env";
import { Workbook } from "exceljs";
import { Express } from "express";
import { existsSync, mkdirSync, renameSync } from "fs";
import sharp from "sharp";
import { crearApp } from "../app";
import { reportePorGrupo } from "../helpers/excelFunctions";
import ConfiguracionService from "../services/ConfiguracionService";
import CorreoService, { TransporteCorreo } from "../services/CorreoService";
import { DescriptorTransporte } from "../services/reglas/correo";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, nombreUnico } from "./factories";
import { SEMILLA } from "./seed";

const esperarHasta = async <T>(fn: () => T, condicion: (v: T) => boolean, ms = 5000) => {
  const inicio = Date.now();
  while (!condicion(fn()) && Date.now() - inicio < ms) await new Promise((r) => setTimeout(r, 50));
  return fn();
};

describe("plan 03 · fase 2 · correo y reportes desde la configuración", () => {
  let app: Express;
  let admin: ReturnType<typeof clienteAdmin>;
  const enviados: Record<string, any>[] = [];
  const descriptores: DescriptorTransporte[] = [];
  const fabricaOriginal = CorreoService.fabrica;
  const anularOriginal = process.env.SMTP_ANULAR;
  let falla = false;

  const seccion = async (nombre: string) => (await admin.get("/config")).body[nombre] as { valor: any; version: number };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    admin = clienteAdmin(app);
    CorreoService.fabrica = (descriptor): TransporteCorreo => {
      descriptores.push(descriptor);
      return {
        sendMail: async (mensaje) => {
          if (falla) throw new Error("Connection refused");
          enviados.push(mensaje);
          return { messageId: "<prueba@local>", response: "250 OK" };
        },
        verify: async () => true,
      };
    };
    ConfiguracionService.olvidarCache();
    CorreoService.olvidarTransporte();
  });
  afterAll(async () => {
    CorreoService.fabrica = fabricaOriginal;
    process.env.SMTP_ANULAR = anularOriginal;
    CorreoService.olvidarTransporte();
    await cerrarPruebas();
  });

  it("los correos usan las plantillas y el remitente configurados, sin reiniciar", async () => {
    const { valor, version } = await seccion("correo");
    const guardado = await admin.put("/config/correo").send({
      version,
      valor: {
        ...valor,
        remitente: { nombre: "Almacén Demo", correo: "envios@demo.mx" },
        plantillas: { nuevoUsuario: { asunto: "Hola desde {{nombreApp}}", cuerpo: "Tu clave temporal es {{clave}} ({{horas}} h). Ayuda: {{soporteCorreo}}" } },
      },
    });
    expect(guardado.status).toBe(200);

    const correo = `${nombreUnico("c").toLowerCase()}@pruebas.local`;
    const alta = await admin.post("/user/new").send({ nombre: "Con plantilla", correo, vencimiento: "2030-01-01", rolesIds: [], proyectosIds: [], bodegasIds: [], areasIds: [] });
    expect(alta.status).toBe(200);
    const mensaje = await esperarHasta(() => enviados.find((m) => m.to === correo), (m) => m !== undefined);
    expect(mensaje).toMatchObject({ from: '"Almacén Demo" <envios@demo.mx>', subject: "Hola desde Chronos WMS" });
    expect(mensaje!.text).toMatch(/^Tu clave temporal es \S{8,20} \(72 h\)\. Ayuda: soporte@exogrid\.io$/);

    // Se deja como estaba
    expect((await admin.put("/config/correo").send({ version: guardado.body.version, valor })).status).toBe(200);
  });

  it("SMTP_ANULAR gana sobre el transporte guardado; sin él se usa el de la BD", async () => {
    process.env.CONFIG_CLAVE ??= Buffer.alloc(32, 7).toString("base64");
    const { valor, version } = await seccion("correo");
    const transporte = { host: "smtp.real.io", puerto: 465, seguro: true, usuario: "envios", contrasena: "Secreta-1" };
    const guardado = await admin.put("/config/correo").send({ version, valor: { ...valor, transporte } });
    expect(guardado.status).toBe(200);

    expect((await admin.post("/config/correo/prueba")).body).toMatchObject({ enviado: true, transporte: "anulado", destino: SEMILLA.adminCorreo });
    expect(descriptores.at(-1)!.opciones).toEqual({ host: "127.0.0.1", port: 1025, secure: false, ignoreTLS: true });

    delete process.env.SMTP_ANULAR;
    const prueba = await admin.post("/config/correo/prueba");
    expect(prueba.body).toMatchObject({ enviado: true, transporte: "bd", respuesta: "250 OK" });
    expect(descriptores.at(-1)!.opciones).toEqual({ host: "smtp.real.io", port: 465, secure: true, auth: { user: "envios", pass: "Secreta-1" } });
    expect(JSON.stringify(prueba.body)).not.toContain("Secreta-1");
    expect(enviados.at(-1)!.subject).toBe("Chronos WMS - correo de prueba");

    falla = true;
    const fallida = await admin.post("/config/correo/prueba");
    expect(fallida.status).toBe(502);
    expect(fallida.body).toMatchObject({ transporte: "bd", message: expect.stringMatching(/Connection refused/) });
    falla = false;

    process.env.SMTP_ANULAR = anularOriginal;
    expect((await admin.put("/config/correo").send({ version: guardado.body.version, valor: { ...valor, transporte: null } })).status).toBe(200);
  });

  it("el reporte Excel lleva el logo configurado en reportes.logoId", async () => {
    mkdirSync(process.env.ARCHIVOS_AUXILIARES as string, { recursive: true });
    const historico = `${process.env.ARCHIVOS_AUXILIARES}sony-tv-logo.jpg`;
    if (existsSync(historico)) renameSync(historico, `${historico}.apartado`);
    try {
      const logo = await sharp({ create: { width: 300, height: 120, channels: 3, background: "#ff0000" } }).png().toBuffer();
      expect((await admin.post("/config/reportes/logo").attach("file", logo, "logo.png")).status).toBe(200);
      const grupoId = (await crearGrupoDetalle(admin, 14)).id;
      await crearArticulo(admin, { grupoId, cantidad: 1, movimientoTipoId: 14 });
      const { path } = (await reportePorGrupo({ grupoId, grupoNombre: "Logo", movimientoTipoNombre: "ALTA", conFoto: false, filters: {}, nombreAlmacenista: "QA" })) as { path: string };
      const libro = await new Workbook().xlsx.readFile(path);
      const medios = (libro.model as unknown as { media: { buffer: Buffer }[] }).media;
      expect(medios).toHaveLength(1);
      const meta = await sharp(medios[0].buffer).metadata();
      expect([meta.width, meta.height]).toEqual([300, 120]);
    } finally {
      if (existsSync(`${historico}.apartado`)) renameSync(`${historico}.apartado`, historico);
      const { valor, version } = await seccion("reportes");
      await admin.put("/config/reportes").send({ version, valor: { ...valor, logoId: null } });
    }
  });
});
