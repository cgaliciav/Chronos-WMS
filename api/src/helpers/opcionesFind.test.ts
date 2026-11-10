import { rutasAObjeto } from "./opcionesFind";

describe("rutasAObjeto", () => {
  it("convierte rutas con puntos en el objeto de relaciones de TypeORM 1.x", () => {
    expect(rutasAObjeto(["sesion", "sesion.usuario", "archivos", "a.b.c"])).toEqual({
      sesion: { usuario: true },
      archivos: true,
      a: { b: { c: true } },
    });
  });
  it("una relación anidada antes que su padre no se pierde", () => {
    expect(rutasAObjeto(["sesion.usuario", "sesion"])).toEqual({ sesion: { usuario: true } });
  });
  it("lista vacía → objeto vacío", () => {
    expect(rutasAObjeto([])).toEqual({});
  });
});
