/**
 * Caracterización de los reportes Excel (antes de unificar las funciones duplicadas de `excelFunctions`, hallazgo
 * L11): genera cada reporte sobre un proyecto propio y fija su contenido (hojas, celdas, imágenes y alturas de fila)
 * en una instantánea. Los valores que cambian entre ejecuciones (códigos, fechas, número aleatorio del nombre) se
 * normalizan.
 */
import "./env";
import { Workbook } from "exceljs";
import { Express } from "express";
import { mkdirSync } from "fs";
import { basename } from "path";
import sharp from "sharp";
import { crearApp } from "../app";
import { AppDataSource } from "../data-source";
import { Proyecto } from "../entity/Proyecto";
import {
  reporteGeneral,
  reportePorGrupo,
  reportePorGrupoFotoGrande,
  reportePorPrestamosRentasActivas,
  reportePorProyecto,
  reportePorProyectoCompras,
} from "../helpers/excelFunctions";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoCompra, crearGrupoDetalle, registrarOperacion } from "./factories";
import { SEMILLA } from "./seed";

const NOMBRE_PROYECTO = "PROYECTO REPORTES";

/** Normaliza lo que cambia entre ejecuciones. */
const normalizar = (valor: unknown): unknown => {
  if (valor instanceof Date) return "<fecha>";
  if (typeof valor === "string") {
    return valor
      .replace(/\b[A-Z0-9]+-\d{10,}-\d+\b/g, "<unico>") // nombreUnico() de las fábricas
      .replace(/T-\d{10,}/g, "T-<tabla>") // nombre de tabla de exceljs (Date.now())
      .replace(/T\d{11,}/g, "<codigo>")
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "<fecha>")
      .replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?/g, "<fecha>");
  }
  if (valor && typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    if ("formula" in o) return { formula: normalizar(o.formula) };
    if ("richText" in o) return (o.richText as { text: string }[]).map((t) => normalizar(t.text)).join("");
    if ("text" in o) return normalizar(o.text);
    return JSON.stringify(o);
  }
  return valor;
};

/** Huella de un .xlsx: nombre (sin el número aleatorio) y, por hoja, filas con valores, alturas e imágenes. */
const huella = async (ruta: string) => {
  const libro = await new Workbook().xlsx.readFile(ruta);
  return {
    archivo: normalizar(basename(ruta).replace(/_\d+\.xlsx$/, "_N.xlsx")),
    hojas: libro.worksheets.map((hoja) => {
      const filas: unknown[] = [];
      hoja.eachRow({ includeEmpty: false }, (fila, n) => {
        const valores = (fila.values as unknown[]).slice(1).map(normalizar);
        filas.push({ n, altura: fila.height ?? null, valores });
      });
      return {
        nombre: hoja.name,
        columnas: hoja.columns?.map((c) => c.width ?? null) ?? [],
        combinadas: Object.keys((hoja as unknown as { _merges: Record<string, unknown> })._merges ?? {}).sort(),
        imagenes: hoja.getImages().map((i) => ({ desde: [i.range.tl.col, i.range.tl.row].map((x) => Math.round(x * 100) / 100) })),
        filas,
      };
    }),
  };
};

describe("caracterización de los reportes Excel", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  let proyectoId: number;
  let grupoPrestamo: number;

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
    mkdirSync(process.env.ARCHIVOS_AUXILIARES as string, { recursive: true });
    await sharp({ create: { width: 40, height: 20, channels: 3, background: "#000" } })
      .jpeg()
      .toFile(`${process.env.ARCHIVOS_AUXILIARES}sony-tv-logo.jpg`);

    // Proyecto propio: los reportes por proyecto no ven datos de otras suites
    const repo = AppDataSource.getRepository(Proyecto);
    const proyecto =
      (await repo.findOneBy({ nombre: NOMBRE_PROYECTO })) ??
      (await repo.save(
        Object.assign(new Proyecto(), {
          nombre: NOMBRE_PROYECTO, descripcion: "Reportes", fechaInicio: new Date("2026-01-01"), productor: "QA", esExterno: false,
        })
      ));
    proyectoId = proyecto.id;
    await AppDataSource.query("INSERT IGNORE INTO usuario_proyectos_proyecto (usuarioId, proyectoId) VALUES (?, ?)", [SEMILLA.adminId, proyectoId]);

    const foto = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#c00" } }).png().toBuffer();
    const grupoAlta = (await crearGrupoDetalle(api, 14, proyectoId)).id;
    grupoPrestamo = (await crearGrupoDetalle(api, 3, proyectoId)).id;
    const grupoDevolucion = (await crearGrupoDetalle(api, 4, proyectoId)).id;
    const precios = [1000, 2500, 400];
    for (const [i, precio] of precios.entries()) {
      const { codigo, movimiento } = await crearArticulo(api, { grupoId: grupoAlta, cantidad: 2, movimientoTipoId: 14, precio, proyectoId });
      if (i < 2) {
        const productoId = (movimiento.inventarioActual as any).producto.id;
        expect((await api.post("/item/file").field("id", String(productoId)).attach("file", foto, "foto.png")).status).toBe(200);
      }
      expect((await registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamo, proyectoId })).status).toBe(200);
      if (i === 0) {
        expect((await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 4, grupoId: grupoDevolucion, proyectoId })).status).toBe(200);
      }
    }
    const grupoCompra = (await crearGrupoCompra(api, proyectoId)).id;
    await crearArticulo(api, { grupoId: grupoCompra, cantidad: 1, movimientoTipoId: 15, precio: 750, proyectoId });
  });
  afterAll(cerrarPruebas);

  const comun = { sortField: undefined, sortOrder: undefined, filters: {}, nombreAlmacenista: "Pruebas" };

  it.each([
    ["por grupo", () => reportePorGrupo({ ...comun, grupoId: grupoPrestamo, grupoNombre: "Préstamos QA", movimientoTipoNombre: "PRÉSTAMO", conFoto: true })],
    ["por grupo sin fotos", () => reportePorGrupo({ ...comun, grupoId: grupoPrestamo, grupoNombre: "Préstamos QA", movimientoTipoNombre: "PRÉSTAMO", conFoto: false })],
    ["por grupo, foto grande", () => reportePorGrupoFotoGrande({ ...comun, grupoId: grupoPrestamo, grupoNombre: "Préstamos QA", movimientoTipoNombre: "PRÉSTAMO", conFoto: true })],
    ["por proyecto", () => reportePorProyecto({ ...comun, proyectoId, movimientoTipoId: [3], movimientoTipoNombre: "PRÉSTAMO", conFoto: true })],
    ["por proyecto, compras", () => reportePorProyectoCompras({ ...comun, proyectoId, movimientoTipoId: [15], movimientoTipoNombre: "COMPRA", conFoto: true })],
    ["préstamos y rentas activos", () => reportePorPrestamosRentasActivas({ ...comun, proyectoId, movimientoTipoNombre: "ACTIVOS", conFoto: true })],
    ["de cierre", () => reporteGeneral({ proyectoId, conFoto: true })],
  ])("%s", async (_nombre, generar) => {
    const { path } = (await generar()) as { path: string };
    expect(await huella(path)).toMatchSnapshot();
  });
});
