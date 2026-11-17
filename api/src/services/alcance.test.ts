import { ModoVisibilidad } from "../entity/common/ModoVisibilidad";
import { AppError } from "../helpers/errorClases";
import { Alcance, ALCANCE_GENERAL, alcanceDe, esRestringido, exigirProyectoPermitido, sqlAlcance } from "./alcance";

const produccion = (proyectos: number[]): Alcance => ({ modo: ModoVisibilidad.PRODUCCION, usuarioId: 7, proyectos });
const usuario: Alcance = { modo: ModoVisibilidad.USUARIO, usuarioId: 7, proyectos: [1] };

const plano = (sql: string | null) => (sql ?? "").replace(/\s+/g, " ");

describe("alcance de datos por usuario (decisión 21)", () => {
  it("el alcance general no añade ninguna condición", () => {
    expect(sqlAlcance(ALCANCE_GENERAL, "ia.id")).toBeNull();
    expect(sqlAlcance(undefined, "ia.id")).toBeNull();
    expect(esRestringido(ALCANCE_GENERAL)).toBe(false);
    expect(alcanceDe({})).toBe(ALCANCE_GENERAL);
    expect(alcanceDe({ alcance: usuario })).toBe(usuario);
  });

  it("producción: compra o transformación de sus proyectos, o último movimiento con operación de uno de ellos", () => {
    const sql = plano(sqlAlcance(produccion([3, 9]), "inventarioActual.id"));
    expect(sql).toContain("alc_m.inventarioActualId = inventarioActual.id");
    expect(sql).toContain("alc_o.proyectoId IN (3, 9)");
    expect(sql).toContain("alc_o.movimientoTipoId IN (1, 15)");
    expect(sql).toContain("SELECT MAX(alc_u.id) FROM movimiento alc_u WHERE alc_u.inventarioActualId = inventarioActual.id AND alc_u.operacionId IS NOT NULL");
    expect(esRestringido(produccion([3]))).toBe(true);
  });

  it("producción sin proyectos asignados no ve nada", () => {
    expect(sqlAlcance(produccion([]), "ia.id")).toBe("1 = 0");
  });

  it("usuario: quien registró el movimiento o responsable de la operación, en cualquier movimiento", () => {
    const sql = plano(sqlAlcance(usuario, "ia.id"));
    expect(sql).toContain("alc_m.inventarioActualId = ia.id");
    expect(sql).toContain("alc_s.usuarioId = 7");
    expect(sql).toContain("alc_ou.operacionId = alc_m.operacionId AND alc_ou.usuarioId = 7");
    expect(sql).not.toContain("proyectoId");
  });

  it("solo interpola enteros válidos", () => {
    expect(() => sqlAlcance(produccion(["1 OR 1=1" as unknown as number]), "ia.id")).toThrow(AppError);
    expect(() => sqlAlcance({ ...usuario, usuarioId: NaN }, "ia.id")).toThrow(AppError);
  });

  it("exigirProyectoPermitido: en modo producción solo sus proyectos; los demás modos no restringen el proyecto", () => {
    expect(() => exigirProyectoPermitido(produccion([3]), 3)).not.toThrow();
    expect(() => exigirProyectoPermitido(produccion([3]), "3")).not.toThrow();
    for (const proyecto of [4, null, undefined]) {
      let error: AppError | undefined;
      try {
        exigirProyectoPermitido(produccion([3]), proyecto);
      } catch (e) {
        error = e as AppError;
      }
      expect(error?.statusCode).toBe(403);
    }
    expect(() => exigirProyectoPermitido(usuario, 99)).not.toThrow();
    expect(() => exigirProyectoPermitido(ALCANCE_GENERAL, null)).not.toThrow();
  });
});
