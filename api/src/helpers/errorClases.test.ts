import { AppError } from "./errorClases";

describe("AppError", () => {
  it("usa 500 cuando no se indica código", () => {
    const e = new AppError("algo");
    expect(e.statusCode).toBe(500);
    expect(e.message).toBe("algo");
    expect(e.status).toBe("undefined Error en servidor");
  });

  it.each([
    [401, "Sin autorización"],
    [403, "Prohibido"],
    [404, "Recurso no encontrado"],
    [405, "Método no permitido"],
    [408, "Solicitud expirada"],
    [409, "Conflicto"],
  ])("mapea %i a '%s'", (codigo, texto) => {
    expect(new AppError("x", codigo).status).toBe(texto);
  });

  it("describe otros 4xx como solicitud incorrecta y 5xx como error en servidor", () => {
    expect(new AppError("x", 400).status).toBe("400 Solicitud Incorrecta");
    expect(new AppError("x", 422).status).toBe("422 Solicitud Incorrecta");
    expect(new AppError("x", 503).status).toBe("503 Error en servidor");
  });

  it("guarda el detalle opcional que el middleware añade a la respuesta", () => {
    expect(new AppError("x", 409, { candidatas: [1] }).detalle).toEqual({ candidatas: [1] });
    expect(new AppError("x", 400).detalle).toBeUndefined();
  });

  it("es un Error con stack", () => {
    const e = new AppError("x", 400);
    expect(e).toBeInstanceOf(Error);
    expect(e.stack).toContain("errorClases.test");
  });
});
