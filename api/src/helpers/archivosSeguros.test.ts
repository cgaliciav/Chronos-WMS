import { esImagen, extensionSegura, nombreArchivoSeguro, nombreReporteSeguro } from "./archivosSeguros";

describe("nombreArchivoSeguro", () => {
  it("quita directorios y recorridos", () => {
    expect(nombreArchivoSeguro("../../etc/passwd")).toBe("passwd");
    expect(nombreArchivoSeguro("..%2F..%2Fetc%2Fpasswd")).toBe("passwd");
    expect(nombreArchivoSeguro("C:\\x\\reporte.xlsx")).toBe("reporte.xlsx");
    expect(nombreArchivoSeguro("reporte 2026 (final).xlsx")).toBe("reporte_2026__final_.xlsx");
  });
  it("rechaza vacíos y puntos", () => {
    expect(() => nombreArchivoSeguro("")).toThrow();
    expect(() => nombreArchivoSeguro("..")).toThrow();
    expect(() => nombreArchivoSeguro(undefined)).toThrow();
  });
});

describe("nombreReporteSeguro", () => {
  it("conserva espacios y acentos, y quita directorios", () => {
    expect(nombreReporteSeguro("Alta Proyecto A_794697.xlsx")).toBe("Alta Proyecto A_794697.xlsx");
    expect(nombreReporteSeguro("Pr%C3%A9stamo%20Proyecto_1.xlsx")).toBe("Préstamo Proyecto_1.xlsx");
    expect(nombreReporteSeguro("../../etc/passwd")).toBe("passwd");
    expect(nombreReporteSeguro("..%2F..%2Fetc%2Fpasswd")).toBe("passwd");
    expect(nombreReporteSeguro("C:\\x\\reporte.xlsx")).toBe("reporte.xlsx");
  });
  it("rechaza vacíos, ocultos y caracteres de control", () => {
    expect(() => nombreReporteSeguro("")).toThrow();
    expect(() => nombreReporteSeguro("..")).toThrow();
    expect(() => nombreReporteSeguro(".env")).toThrow();
    expect(() => nombreReporteSeguro("a%0Ab.xlsx")).toThrow();
    expect(() => nombreReporteSeguro(undefined)).toThrow();
  });
});

describe("extensionSegura / esImagen", () => {
  it("prefiere el MIME y cae al nombre", () => {
    expect(extensionSegura("image/jpeg", "foto.bin")).toBe(".jpg");
    expect(extensionSegura("application/octet-stream", "doc.PDF")).toBe(".pdf");
    expect(extensionSegura(undefined, "sin_extension")).toBe("");
    expect(extensionSegura(undefined, "x.exe/../y")).toBe("");
  });
  it("esImagen", () => {
    expect(esImagen("image/png")).toBe(true);
    expect(esImagen("application/pdf")).toBe(false);
    expect(esImagen(undefined)).toBe(false);
  });
});
