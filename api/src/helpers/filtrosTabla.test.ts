import { andWhereIn, columnaSegura, combinarFiltros, construirFiltros, direccionSegura, literalSeguro, textoBusquedaBooleana } from "./filtrosTabla";

describe("construirFiltros", () => {
  it("devuelve vacío sin filtros", () => {
    expect(construirFiltros(undefined)).toEqual({ sql: "", parametros: {} });
    expect(construirFiltros({})).toEqual({ sql: "", parametros: {} });
    expect(construirFiltros({ nombre: null, estatus: [] })).toEqual({ sql: "", parametros: {} });
  });

  it("genera LIKE para textuales con el último valor, BETWEEN para fechas e IN para el resto", () => {
    const f = construirFiltros(
      { nombre: ["a", "ana"], vencimiento: ["2026-01-01", "2026-12-31"], estatus: ["activo", "inactivo"] },
      { alias: "usuario" }
    );
    expect(f.sql).toBe("usuario.nombre LIKE :f0 AND (usuario.vencimiento BETWEEN :f1 AND :f2) AND usuario.estatus IN (:...f3)");
    expect(f.parametros).toEqual({ f0: "%ana%", f1: "2026-01-01", f2: "2026-12-31", f3: ["activo", "inactivo"] });
  });

  it("respeta las llaves que ya traen alias y acepta valores escalares", () => {
    const f = construirFiltros({ "proyecto.id": 7, "grupo.nombre": "lista" }, { alias: "movimiento" });
    expect(f.sql).toBe("proyecto.id IN (:...f0) AND grupo.nombre LIKE :f1");
    expect(f.parametros).toEqual({ f0: [7], f1: "%lista%" });
  });

  it("no interpola el valor: una inyección queda como parámetro literal", () => {
    const malicioso = "x' OR '1'='1";
    const f = construirFiltros({ nombre: [malicioso] }, { alias: "area" });
    expect(f.sql).toBe("area.nombre LIKE :f0");
    expect(f.parametros.f0).toBe(`%${malicioso}%`);
  });

  it("rechaza llaves que no son identificadores (inyección por nombre de columna)", () => {
    expect(() => construirFiltros({ "nombre LIKE '%a%' OR 1=1 --": ["x"] })).toThrow(/Filtro inválido/);
    expect(() => construirFiltros({ "a.b.c": ["x"] })).toThrow(/Filtro inválido/);
  });

  it("no muta el objeto de filtros", () => {
    const filters = { nombre: ["a", "b"] };
    construirFiltros(filters);
    expect(filters.nombre).toEqual(["a", "b"]);
  });

  it("permite tratamientos especiales", () => {
    const f = construirFiltros(
      { estatusExtendido: ["vencido"] },
      {
        alias: "usuario",
        especiales: (llave, valores, p) =>
          llave === "estatusExtendido" ? `IF(usuario.estatus="inactivo","inactivo","activo") IN (${valores.map(p).join(",")})` : undefined,
      }
    );
    expect(f.sql).toBe('IF(usuario.estatus="inactivo","inactivo","activo") IN (:f0)');
    expect(f.parametros).toEqual({ f0: "vencido" });
  });
});

describe("columnaSegura / direccionSegura", () => {
  it("acepta identificadores simples y con alias", () => {
    expect(columnaSegura("id", "x.id")).toBe("id");
    expect(columnaSegura("movimiento.id", "x.id")).toBe("movimiento.id");
    expect(columnaSegura(undefined, "x.id")).toBe("x.id");
    expect(columnaSegura("", "x.id")).toBe("x.id");
  });
  it("convierte arreglos de antd a alias.columna", () => {
    expect(columnaSegura(["operacion", "proyecto", "nombre"], "id")).toBe("proyecto.nombre");
  });
  it("rechaza expresiones", () => {
    expect(() => columnaSegura("id; DROP TABLE usuario", "id")).toThrow(/Campo de orden inválido/);
    expect(() => columnaSegura("(SELECT 1)", "id")).toThrow();
  });
  it("direccion", () => {
    expect(direccionSegura("descend")).toBe("DESC");
    expect(direccionSegura("ascend")).toBe("ASC");
    expect(direccionSegura(undefined)).toBe("ASC");
  });
});

describe("combinarFiltros / andWhereIn", () => {
  it("une condiciones con AND y mezcla parámetros", () => {
    const f = combinarFiltros({ sql: "a=:p0", parametros: { p0: 1 } }, "", "b IS NULL", { sql: "", parametros: {} });
    expect(f).toEqual({ sql: "a=:p0 AND b IS NULL", parametros: { p0: 1 } });
  });
  it("andWhereIn usa 1=0 con arreglo vacío y parámetros con valores", () => {
    const qb: any = { andWhere: jest.fn().mockReturnThis() };
    andWhereIn(qb, "area.id", [], "areas");
    expect(qb.andWhere).toHaveBeenCalledWith("1=0");
    andWhereIn(qb, "area.id", [1, 2], "areas");
    expect(qb.andWhere).toHaveBeenCalledWith("area.id IN (:...areas)", { areas: [1, 2] });
    expect(() => andWhereIn(qb, "area.id) OR (1=1", [1], "x")).toThrow();
  });
});

describe("literalSeguro", () => {
  it("escapa comillas y barras para usarlo dentro de AGAINST", () => {
    expect(literalSeguro("hola")).toBe("'hola'");
    expect(literalSeguro("x') OR 1=1 --")).toBe("'x\\') OR 1=1 --'");
  });
});

describe("textoBusquedaBooleana", () => {
  it("quita operadores del modo booleano y escapa", () => {
    expect(textoBusquedaBooleana("Artículo') OR 1=1 --")).toBe("'Artículo\\' OR 1=1'"); // el `-` es operador booleano y se quita
    expect(textoBusquedaBooleana("  cable*  hdmi ")).toBe("'cable* hdmi'");
    expect(textoBusquedaBooleana("()")).toBeNull();
    expect(textoBusquedaBooleana(undefined)).toBeNull();
  });
});
