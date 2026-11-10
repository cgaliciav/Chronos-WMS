/**
 * Plan 02 · fase 5: humo de las piezas que tocan las dependencias que se actualizan (multer, sharp, exceljs):
 * subir una imagen a un producto, servirla con su miniatura y generar un reporte Excel con fotos.
 */
import "./env";
import { Express } from "express";
import { existsSync, readFileSync } from "fs";
import http from "http";
import { AddressInfo } from "net";
import { crearApp } from "../app";
import { reportePorGrupo } from "../helpers/excelFunctions";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, tokenAdmin } from "./factories";

// PNG de 8×8 px (rojo): lo bastante grande para que sharp lo redimensione de verdad.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC",
  "base64"
);

describe("fase 5 · humo de archivos e informes", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  let grupoId: number;
  let archivoId: number;

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
    grupoId = (await crearGrupoDetalle(api, 14)).id;
  });
  afterAll(cerrarPruebas);

  it("POST /item/file sube una imagen al producto (multer) y GET /file/:id y la miniatura la sirven (sharp)", async () => {
    const { movimiento } = await crearArticulo(api, { grupoId, cantidad: 1, movimientoTipoId: 14 });
    const productoId = (movimiento.inventarioActual as any).producto.id;
    const subida = await api.post("/item/file").field("id", String(productoId)).attach("file", PNG, "foto.png");
    expect(subida.status).toBe(200);
    expect(subida.body).toMatchObject({ status: "done", type: "image/png", name: "foto.png" });
    archivoId = Number(subida.body.url.split("/").pop());

    const original = await api.get(`/file/${archivoId}`);
    expect(original.status).toBe(200);
    expect(original.headers["content-type"]).toMatch(/image\/png/);
    for (const variante of ["thumbnail", "catalog", "review"]) {
      const res = await api.get(`/file/${variante}/${archivoId}`);
      expect(res.status).toBe(200);
      expect(Number(res.headers["content-length"])).toBeGreaterThan(0);
    }
  });

  it("acepta barras repetidas como Express 4: `//file/thumbnail/:id` y `//file/file` (front hasta v4.2.1)", async () => {
    // Petición HTTP cruda: supertest (y `new URL`) leerían `//file/...` como una URL sin protocolo con host "file".
    const servidor = http.createServer(app).listen(0);
    const { port } = servidor.address() as AddressInfo;
    const pedir = (method: string, path: string) =>
      new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port, method, path, headers: { auth: tokenAdmin() } }, (res) => {
          res.resume();
          resolve(res);
        });
        req.on("error", reject);
        req.end();
      });
    try {
      const miniatura = await pedir("GET", `//file/thumbnail/${archivoId}`);
      expect(miniatura.statusCode).toBe(200);
      expect(Number(miniatura.headers["content-length"])).toBeGreaterThan(0);
      // La subida llega a su ruta (sin archivo responde un error de validación, no 404)
      const subida = await pedir("POST", "//file/file");
      expect(subida.statusCode).not.toBe(404);
    } finally {
      servidor.close();
    }
  });

  it("un archivo mayor que el límite de multer responde 4xx sin tumbar el proceso", async () => {
    const grande = Buffer.alloc(16 * 1024 * 1024, 1); // TAMANO_MAXIMO_ARCHIVO = 15 MiB
    const res = await api.post("/item/file").field("id", "1").attach("file", grande, "grande.png");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("el reporte por grupo genera un .xlsx válido con las fotos de los artículos (exceljs + sharp)", async () => {
    const { path } = (await reportePorGrupo({ grupoId, grupoNombre: "Humo", movimientoTipoNombre: "ALTA", conFoto: true, filters: {}, nombreAlmacenista: "Pruebas" })) as { path: string };
    expect(existsSync(path)).toBe(true);
    const contenido = readFileSync(path);
    expect(contenido.subarray(0, 2).toString()).toBe("PK"); // un .xlsx es un ZIP
    // Cada archivo del ZIP aparece dos veces (cabecera local y directorio central): logo + foto = al menos 4.
    const imagenes = contenido.toString("latin1").split("xl/media/").length - 1;
    expect(imagenes).toBeGreaterThanOrEqual(4);
  });
});
