import { esImagen, extensionSegura, nombreArchivoSeguro } from "./archivosSeguros";

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
