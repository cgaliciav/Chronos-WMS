import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Hallazgo M34: el .env debe cargarse al importar el módulo (antes que enviarMail, logger o las rutas con multer).
describe("entorno", () => {
  const original = { ...process.env };
  let archivo: string;

  beforeAll(() => {
    archivo = join(mkdtempSync(join(tmpdir(), "entorno-")), ".env");
    writeFileSync(archivo, "PRUEBA_ENTORNO_M34=cargado\n");
  });

  afterEach(() => {
    process.env = { ...original };
  });

  const importar = () => jest.isolateModules(() => require("./entorno"));

  it("carga ENV_FILE al importarse fuera de producción", () => {
    process.env.NODE_ENV = "development";
    process.env.ENV_FILE = archivo;
    importar();
    expect(process.env.PRUEBA_ENTORNO_M34).toBe("cargado");
  });

  it("no lee ningún archivo en producción", () => {
    process.env.NODE_ENV = "production";
    process.env.ENV_FILE = archivo;
    importar();
    expect(process.env.PRUEBA_ENTORNO_M34).toBeUndefined();
  });

  it("no pisa variables que ya trae el entorno", () => {
    process.env.NODE_ENV = "development";
    process.env.ENV_FILE = archivo;
    process.env.PRUEBA_ENTORNO_M34 = "del-entorno";
    importar();
    expect(process.env.PRUEBA_ENTORNO_M34).toBe("del-entorno");
  });
});
