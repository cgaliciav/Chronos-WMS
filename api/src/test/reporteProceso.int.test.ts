/**
 * Decisión 27: los reportes pasan por una cola (uno a la vez) y se generan en un proceso aparte con la memoria
 * limitada. El resto de las pruebas usa `REPORTES_PROCESO=interno` (`test/env.ts`); aquí se lanza el proceso real.
 */
import "./env";
import { Workbook } from "exceljs";
import { Express } from "express";
import { existsSync } from "fs";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import EnviarMail from "../helpers/enviarMail";
import { ArchivoReporte } from "../helpers/generadoresReporte";
import ReporteService, { memoriaReportesMb, minutosMaximosReporte } from "../services/ReporteService";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoCompra } from "./factories";
import { SEMILLA } from "./seed";

describe("cola y proceso de reportes", () => {
  let app: Express;
  let admin: ReturnType<typeof clienteAdmin>;
  const notificaciones = async (desdeId: number) =>
    (await AppDataSource.query("SELECT titulo, mensaje, url FROM notificacion WHERE usuarioId = ? AND id > ? ORDER BY id", [SEMILLA.adminId, desdeId])) as {
      titulo: string;
      mensaje: string | null;
      url: string | null;
    }[];
  const ultimaNotificacion = async () => Number((await AppDataSource.query("SELECT COALESCE(MAX(id), 0) AS id FROM notificacion"))[0].id);
  const esperar = async (condicion: () => Promise<boolean>, ms = 15000) => {
    const limite = Date.now() + ms;
    while (!(await condicion())) {
      if (Date.now() > limite) throw new Error("No se cumplió la condición a tiempo");
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    admin = clienteAdmin(app);
    jest.spyOn(EnviarMail, "correoConAnexos").mockImplementation(() => undefined);
    jest.spyOn(EnviarMail, "correorReporteDescarga").mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.env.REPORTES_PROCESO = "interno";
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await cerrarPruebas();
  });

  it("límites por defecto y por variable de entorno", () => {
    const previos = { memoria: process.env.REPORTES_MEMORIA_MB, minutos: process.env.REPORTES_MINUTOS_MAX };
    delete process.env.REPORTES_MEMORIA_MB;
    delete process.env.REPORTES_MINUTOS_MAX;
    expect([memoriaReportesMb(), minutosMaximosReporte()]).toEqual([768, 30]);
    process.env.REPORTES_MEMORIA_MB = "1024";
    process.env.REPORTES_MINUTOS_MAX = "5";
    expect([memoriaReportesMb(), minutosMaximosReporte()]).toEqual([1024, 5]);
    process.env.REPORTES_MEMORIA_MB = "abc"; // inválido: se usa el valor por defecto
    process.env.REPORTES_MINUTOS_MAX = "0";
    expect([memoriaReportesMb(), minutosMaximosReporte()]).toEqual([768, 30]);
    process.env.REPORTES_MEMORIA_MB = previos.memoria;
    process.env.REPORTES_MINUTOS_MAX = previos.minutos;
    if (previos.memoria === undefined) delete process.env.REPORTES_MEMORIA_MB;
    if (previos.minutos === undefined) delete process.env.REPORTES_MINUTOS_MAX;
  });

  it("el proceso hijo genera el Excel y devuelve el archivo; sus errores llegan como mensaje", async () => {
    const compra = await crearGrupoCompra(admin);
    const articulo = await crearArticulo(admin, { grupoId: compra.id });
    process.env.REPORTES_PROCESO = "hijo";

    const archivo = await ReporteService.generar("porProveedor", { proveedorId: SEMILLA.proveedorId, proyectoId: SEMILLA.proyectoAId, conFoto: false });
    expect(existsSync(archivo.path)).toBe(true);
    expect(archivo.nombreReporte).toMatch(/\.xlsx$/);
    const libro = await new Workbook().xlsx.readFile(archivo.path);
    const celdas: string[] = [];
    libro.worksheets[0].eachRow((fila) => fila.eachCell((celda) => void celdas.push(String(celda.text))));
    expect(celdas.join(" | ")).toContain(articulo.codigo);

    await expect(ReporteService.generar("porProveedor", { proveedorId: 99999999 })).rejects.toThrow("Proveedor no encontrado");
    await expect(ReporteService.generar("noExiste" as never, {})).rejects.toThrow(/Tipo de reporte desconocido/);
  }, 120000);

  it("solo se genera un reporte a la vez; al que espera se le avisa de que está en cola", async () => {
    const desde = await ultimaNotificacion();
    const liberar: (() => void)[] = [];
    const enCurso: string[] = [];
    let simultaneos = 0;
    let maximoSimultaneos = 0;
    const generar = jest.spyOn(ReporteService, "generar").mockImplementation(async (tipo) => {
      simultaneos++;
      maximoSimultaneos = Math.max(maximoSimultaneos, simultaneos);
      enCurso.push(tipo);
      await new Promise<void>((resolver) => liberar.push(resolver));
      simultaneos--;
      throw new Error(`reporte simulado ${enCurso.length}`); // la cola sigue aunque un reporte falle
    });
    try {
      const pedir = () => admin.post("/reports/by-supplier").send({ proveedorId: SEMILLA.proveedorId, conFoto: false });
      const primero = await pedir();
      const segundo = await pedir();
      const tercero = await pedir();
      expect([primero.status, segundo.status, tercero.status]).toEqual([200, 200, 200]);
      expect(primero.body.message).toMatch(/se está generando/);
      expect(segundo.body.message).toMatch(/está en cola: hay 1 reporte antes que el tuyo.*puede tardar un poco más/);
      expect(tercero.body.message).toMatch(/hay 2 reportes antes que el tuyo/);
      expect(ReporteService.porDelante).toBe(3);

      await esperar(async () => enCurso.length === 1);
      liberar[0]();
      await esperar(async () => enCurso.length === 2);
      liberar[1]();
      await esperar(async () => enCurso.length === 3);
      liberar[2]();
      await esperar(async () => (await notificaciones(desde)).filter((n) => n.titulo === "Error al generar el reporte").length === 3);
      expect(maximoSimultaneos).toBe(1);
      expect(ReporteService.porDelante).toBe(0);

      const avisos = await notificaciones(desde);
      expect(avisos.filter((n) => n.titulo === "Reporte en cola").map((n) => n.mensaje)).toEqual([
        "Reporte por proveedor: hay 1 reporte antes que el tuyo. Puede tardar un poco más en generarse.",
        "Reporte por proveedor: hay 2 reportes antes que el tuyo. Puede tardar un poco más en generarse.",
      ]);
    } finally {
      generar.mockRestore();
    }
  });

  it("por la ruta, el reporte sale de la cola generado y con su notificación de descarga", async () => {
    const desde = await ultimaNotificacion();
    const res = await admin.post("/reports/by-supplier").send({ proveedorId: SEMILLA.proveedorId, proyectoId: SEMILLA.proyectoAId, conFoto: false });
    expect(res.status).toBe(200);
    await esperar(async () => (await notificaciones(desde)).some((n) => n.titulo === "Reporte generado"));
    const [aviso] = (await notificaciones(desde)).filter((n) => n.titulo === "Reporte generado");
    expect(aviso.url).toMatch(/^\/file\/report\/Compras_.*\.xlsx$/);
    const generado: ArchivoReporte = { path: `${process.env.RUTA_REPORTES}${decodeURIComponent(aviso.url!.split("/file/report/")[1])}`, nombreReporte: aviso.mensaje! };
    expect(existsSync(generado.path)).toBe(true);
  });
});
