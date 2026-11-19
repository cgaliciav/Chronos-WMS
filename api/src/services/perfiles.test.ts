import { Perfil } from "../entity/common/Perfil";
import { baseCorreoFalso, codigosDePerfil, esCorreoFalso } from "./perfiles";

describe("perfiles", () => {
  it("los permisos salen del perfil; solo `personalizado` usa los roles sueltos", () => {
    expect(codigosDePerfil(Perfil.SUPERADMINISTRADOR, ["X"])).toEqual(["ADMINISTRADOR", "CONFIGURACION-EDITAR"]);
    expect(codigosDePerfil(Perfil.ADMINISTRADOR, ["CONFIGURACION-EDITAR"])).toEqual(["ADMINISTRADOR"]);
    expect(codigosDePerfil(Perfil.PERSONALIZADO, ["X"])).toEqual(["X"]);
    expect(codigosDePerfil(undefined, ["X"])).toEqual(["X"]);
    expect(codigosDePerfil(Perfil.SIN_ACCESO, ["ADMINISTRADOR"])).toEqual([]);
  });

  it("ni Visita ni Encargado de Producción son administradores ni registran préstamos, devoluciones o bajas", () => {
    for (const perfil of [Perfil.VISITA, Perfil.ENCARGADO_PRODUCCION]) {
      const codigos = codigosDePerfil(perfil);
      for (const prohibido of ["ADMINISTRADOR", "CONFIGURACION-EDITAR", "GRUPOS-NUEVODETALLE", "GRUPOS-MOVIMIENTONUEVO", "V-OPERACION-PRESTAMONUEVO"]) {
        expect(codigos).not.toContain(prohibido);
      }
      expect(codigos).toContain("V-OPERACION-PRESTAMOSACTIVOS");
    }
    expect(codigosDePerfil(Perfil.VISITA)).not.toContain("REPORTE-PROYECTO");
  });

  it("correo inventado de los usuarios sin correo", () => {
    expect(baseCorreoFalso("  José Ñandú  Pérez ")).toBe("jose.nandu.perez");
    expect(baseCorreoFalso("¡¡!!")).toBe("usuario");
    expect(esCorreoFalso("Jose@FAKE.exogrid.io ")).toBe(true);
    expect(esCorreoFalso("jose@exogrid.io")).toBe(false);
  });
});
