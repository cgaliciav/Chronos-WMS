import { actividadSchema, inventarioEditarSchema, loginSchema, usuarioNuevoSchema } from "./index";

describe("esquemas zod", () => {
  it("login descarta campos extra como ip", () => {
    const r = loginSchema.parse({ c: "a@b.c", p: "x", ip: "1.2.3.4" });
    expect(r).toEqual({ c: "a@b.c", p: "x" });
  });

  it("actividad convierte números en string y rechaza objetos como id", () => {
    expect(actividadSchema.parse({ codigo: "1234567890", cantidad: "2", movimientoTipoId: "3", proyectoId: 1, grupoId: "7" })).toMatchObject({
      cantidad: 2,
      movimientoTipoId: 3,
      grupoId: 7,
    });
    expect(actividadSchema.safeParse({ codigo: "1234567890", cantidad: 1, grupoId: { id: 1 } }).success).toBe(false);
    expect(actividadSchema.safeParse({ codigo: "1234567890", cantidad: 0, grupoId: 1 }).success).toBe(false);
    expect(actividadSchema.safeParse({ codigo: "12", cantidad: 1, grupoId: 1 }).success).toBe(false);
  });

  it("actividad acepta relaciones { origenId, cantidad } y strict booleano", () => {
    const r = actividadSchema.parse({
      codigo: "1234567890", cantidad: 3, movimientoTipoId: 4, grupoId: 1,
      relaciones: [{ origenId: "10", cantidad: "2", extra: 1 }, { origenId: 11, cantidad: 1 }], strict: true,
    });
    expect(r.relaciones).toEqual([{ origenId: 10, cantidad: 2 }, { origenId: 11, cantidad: 1 }]);
    expect(r.strict).toBe(true);
    expect(actividadSchema.safeParse({ codigo: "1234567890", cantidad: 1, grupoId: 1, strict: "false" }).success).toBe(false);
    expect(actividadSchema.safeParse({ codigo: "1234567890", cantidad: 1, grupoId: 1, relaciones: [{ origenId: 1, cantidad: 0 }] }).success).toBe(false);
  });

  it("usuario nuevo no acepta password ni estatus ni id del cliente", () => {
    const r = usuarioNuevoSchema.parse({
      nombre: "Ana",
      correo: "ana@x.mx",
      vencimiento: "2027-01-01",
      rolesIds: [1],
      password: "pwned",
      estatus: "inactivo",
      id: 1,
    });
    expect(r).not.toHaveProperty("password");
    expect(r).not.toHaveProperty("estatus");
    expect(r).not.toHaveProperty("id");
    expect(usuarioNuevoSchema.safeParse({ nombre: "Ana", correo: "no-es-correo", vencimiento: "2027-01-01" }).success).toBe(false);
  });

  it("editar inventario solo deja pasar bodega y fecha de disponibilidad", () => {
    const r = inventarioEditarSchema.parse({ inventarioActualId: 1, bodegaId: 1, cantidad: 999, disponible: "disponible" });
    expect(r).toEqual({ inventarioActualId: 1, bodegaId: 1 });
  });
});
