/**
 * Pruebas unitarias de MovimientoService.resolverRelaciones con el acceso a datos simulado (plan 02 fase 3).
 * Los controladores importados de forma transitiva escriben logs en la BD: se simulan.
 */
jest.mock("../controllers/LogGeneral.Controller", () => ({ __esModule: true, default: { InsertarLog: jest.fn() } }));

import { EntityManager } from "typeorm";
import { MovimientoTipoId as T } from "../entity/common/MovimientoTipoId";
import { RelacionTipo } from "../entity/common/RelacionTipo";
import { AppError } from "../helpers/errorClases";
import MovimientoService, { ConsultasRelacion } from "./MovimientoService";
import { OrigenAbierto } from "./reglas/planificarRelaciones";

const INV = 50;
const PA = 1; // proyecto A
const PB = 2; // proyecto B

let siguienteId = 100;
const origen = (o: Partial<OrigenAbierto> & { saldo: number }): OrigenAbierto => ({
  movimientoId: ++siguienteId,
  movimientoTipoId: T.PRESTAMO,
  proyectoId: PA,
  proyectoNombre: o.proyectoId === PB ? "Proyecto B" : "Proyecto A",
  fecha: new Date(2026, 0, siguienteId - 100),
  cantidad: o.saldo,
  ...o,
});

const consultas = (abiertos: OrigenAbierto[], pendienteLegado = 0): ConsultasRelacion & { [k: string]: jest.Mock } => ({
  origenesAbiertos: jest.fn(async () => abiertos),
  pendienteLegado: jest.fn(async () => pendienteLegado),
  nombreProyecto: jest.fn(async (_m, id) => (id === PB ? "Proyecto B" : "Proyecto A")),
});

const manager = {} as EntityManager;

const resolver = (
  c: ConsultasRelacion,
  datos: { tipo: number; cantidad: number; proyectoId?: number | null; relaciones?: { origenId: number; cantidad: number }[]; strict?: boolean }
) => MovimientoService.resolverRelaciones(manager, { inventarioActualId: INV, proyectoId: PA, ...datos }, c);

const fallo = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as AppError;
  }
  throw new Error("se esperaba un AppError");
};

describe("resolverRelaciones", () => {
  it("FIFO: una devolución de 7 se reparte entre préstamos de 3 y 4 (dos filas, el más antiguo primero)", async () => {
    const p3 = origen({ saldo: 3 });
    const p4 = origen({ saldo: 4 });
    const plan = await resolver(consultas([p4, p3]), { tipo: T.DEVOLUCION, cantidad: 7 });
    expect(plan.relaciones).toEqual([
      { origenId: p3.movimientoId, cantidad: 3, tipo: RelacionTipo.DEVOLUCION },
      { origenId: p4.movimientoId, cantidad: 4, tipo: RelacionTipo.DEVOLUCION },
    ]);
    expect(plan.cubiertoPorLegado).toBe(0);
  });

  it("saldo parcial: una devolución de 2 contra un préstamo con saldo 5 crea una fila de 2", async () => {
    const p = origen({ saldo: 5 });
    const plan = await resolver(consultas([p]), { tipo: T.DEVOLUCION, cantidad: 2 });
    expect(plan.relaciones).toEqual([{ origenId: p.movimientoId, cantidad: 2, tipo: RelacionTipo.DEVOLUCION }]);
  });

  it("la compra (15) también abre saldo para la primera devolución al almacén", async () => {
    const compra = origen({ saldo: 5, movimientoTipoId: T.COMPRA });
    const plan = await resolver(consultas([compra]), { tipo: T.DEVOLUCION, cantidad: 5 });
    expect(plan.relaciones).toHaveLength(1);
  });

  it("proyecto distinto → 400 con el mensaje heredado", async () => {
    const e = await fallo(resolver(consultas([origen({ saldo: 2, proyectoId: PB })]), { tipo: T.DEVOLUCION, cantidad: 1 }));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/no pertenece al proyecto seleccionado Proyecto A, es del proyecto: Proyecto B/);
  });

  it("sin salidas ni saldo legado → 400 'ya está devuelto'", async () => {
    const e = await fallo(resolver(consultas([]), { tipo: T.DEVOLUCION, cantidad: 1 }));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/YA ESTA DEVUELTO/);
  });

  it("cantidad mayor que el saldo pendiente del proyecto → 400", async () => {
    const e = await fallo(resolver(consultas([origen({ saldo: 2 })]), { tipo: T.DEVOLUCION, cantidad: 3 }));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/EXCEDE EL SALDO PENDIENTE DEL PROYECTO \(2\)/);
  });

  it("12 → 7: la transferencia destino se relaciona con la transferencia origen abierta, de cualquier proyecto", async () => {
    const t7 = origen({ saldo: 2, movimientoTipoId: T.TRANSFERENCIA_ORIGEN, proyectoId: PA });
    const plan = await resolver(consultas([t7]), { tipo: T.TRANSFERENCIA_DESTINO, cantidad: 2, proyectoId: PB });
    expect(plan.relaciones).toEqual([{ origenId: t7.movimientoId, cantidad: 2, tipo: RelacionTipo.TRANSFERENCIA }]);
  });

  it("12 sin 7 abierto se acepta sin relación (compatibilidad) y 12 mayor que lo pendiente → 400", async () => {
    expect((await resolver(consultas([]), { tipo: T.TRANSFERENCIA_DESTINO, cantidad: 1 })).sinOrigen).toBe(true);
    const t7 = origen({ saldo: 1, movimientoTipoId: T.TRANSFERENCIA_ORIGEN });
    expect((await fallo(resolver(consultas([t7]), { tipo: T.TRANSFERENCIA_DESTINO, cantidad: 2 }))).statusCode).toBe(400);
  });

  it("7 (transferencia origen) consume préstamos del proyecto A con tipo TRANSFERENCIA", async () => {
    const p = origen({ saldo: 2 });
    const plan = await resolver(consultas([p]), { tipo: T.TRANSFERENCIA_ORIGEN, cantidad: 2 });
    expect(plan.relaciones).toEqual([{ origenId: p.movimientoId, cantidad: 2, tipo: RelacionTipo.TRANSFERENCIA }]);
  });

  it("bajas con proyecto (13/16/5) generan relaciones de tipo BAJA", async () => {
    const p = origen({ saldo: 1 });
    for (const tipo of [T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA, T.BAJA_LEGADO]) {
      expect((await resolver(consultas([p]), { tipo, cantidad: 1 })).relaciones[0].tipo).toBe(RelacionTipo.BAJA);
    }
  });

  it("strict con varias candidatas → 409 con las candidatas en orden FIFO", async () => {
    const p1 = origen({ saldo: 1 });
    const p2 = origen({ saldo: 1 });
    const e = await fallo(resolver(consultas([p2, p1]), { tipo: T.DEVOLUCION, cantidad: 1, strict: true }));
    expect(e.statusCode).toBe(409);
    expect((e.detalle.candidatas as any[]).map((c) => c.movimientoId)).toEqual([p1.movimientoId, p2.movimientoId]);
    expect(e.detalle.candidatas[0]).toEqual(expect.objectContaining({ fecha: p1.fecha, cantidad: 1, saldo: 1 }));
  });

  it("strict con una sola candidata no pregunta", async () => {
    const p = origen({ saldo: 1 });
    expect((await resolver(consultas([p]), { tipo: T.DEVOLUCION, cantidad: 1, strict: true })).relaciones).toHaveLength(1);
  });

  it("relaciones explícitas válidas se respetan (aunque no sigan FIFO)", async () => {
    const p1 = origen({ saldo: 3 });
    const p2 = origen({ saldo: 3 });
    const plan = await resolver(consultas([p1, p2]), { tipo: T.DEVOLUCION, cantidad: 2, relaciones: [{ origenId: p2.movimientoId, cantidad: 2 }] });
    expect(plan.relaciones).toEqual([{ origenId: p2.movimientoId, cantidad: 2, tipo: RelacionTipo.DEVOLUCION }]);
  });

  it("relaciones explícitas que exceden el saldo → 400", async () => {
    const p = origen({ saldo: 1 });
    const e = await fallo(resolver(consultas([p]), { tipo: T.DEVOLUCION, cantidad: 2, relaciones: [{ origenId: p.movimientoId, cantidad: 2 }] }));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/excede su saldo pendiente/);
  });

  it("suma de relaciones ≠ cantidad → 400", async () => {
    const p = origen({ saldo: 5 });
    const e = await fallo(resolver(consultas([p]), { tipo: T.DEVOLUCION, cantidad: 3, relaciones: [{ origenId: p.movimientoId, cantidad: 2 }] }));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/debe ser igual a la cantidad/);
  });

  it("relaciones explícitas con origen repetido, de otro proyecto o inexistente → 400", async () => {
    const p = origen({ saldo: 5 });
    const otro = origen({ saldo: 5, proyectoId: PB });
    const c = consultas([p, otro]);
    const repetido = await fallo(resolver(c, { tipo: T.DEVOLUCION, cantidad: 2, relaciones: [{ origenId: p.movimientoId, cantidad: 1 }, { origenId: p.movimientoId, cantidad: 1 }] }));
    expect(repetido.message).toMatch(/repetido/);
    const deOtroProyecto = await fallo(resolver(c, { tipo: T.DEVOLUCION, cantidad: 1, relaciones: [{ origenId: otro.movimientoId, cantidad: 1 }] }));
    expect(deOtroProyecto.message).toMatch(/no pertenece al proyecto/);
    const inexistente = await fallo(resolver(c, { tipo: T.DEVOLUCION, cantidad: 1, relaciones: [{ origenId: 9999, cantidad: 1 }] }));
    expect(inexistente.message).toMatch(/no es una salida con saldo pendiente/);
  });

  it("modo de compatibilidad: sin salidas nuevas, el saldo legado del proyecto cubre la devolución sin relaciones", async () => {
    const c = consultas([], 2);
    const plan = await resolver(c, { tipo: T.DEVOLUCION, cantidad: 2 });
    expect(plan).toEqual({ relaciones: [], cubiertoPorLegado: 2, sinOrigen: false });
    expect(c.pendienteLegado).toHaveBeenCalledWith(manager, INV, PA);
  });

  it("modo de compatibilidad mixto: primero las salidas nuevas (FIFO) y el resto contra el saldo legado", async () => {
    const p = origen({ saldo: 1 });
    const plan = await resolver(consultas([p], 3), { tipo: T.DEVOLUCION, cantidad: 3 });
    expect(plan.relaciones).toEqual([{ origenId: p.movimientoId, cantidad: 1, tipo: RelacionTipo.DEVOLUCION }]);
    expect(plan.cubiertoPorLegado).toBe(2);
    expect((await fallo(resolver(consultas([p], 1), { tipo: T.DEVOLUCION, cantidad: 3 }))).statusCode).toBe(400);
  });

  it("bajas libres (8, 17) cierran todas las salidas abiertas del inventario por su saldo completo", async () => {
    const pa = origen({ saldo: 2 });
    const pb = origen({ saldo: 1, proyectoId: PB });
    const t7 = origen({ saldo: 1, movimientoTipoId: T.TRANSFERENCIA_ORIGEN });
    const plan = await resolver(consultas([pb, pa, t7]), { tipo: T.BAJA_EN_INVENTARIO, cantidad: 1, proyectoId: null });
    expect(plan.relaciones).toEqual([
      { origenId: pa.movimientoId, cantidad: 2, tipo: RelacionTipo.CIERRE_INVENTARIO },
      { origenId: pb.movimientoId, cantidad: 1, tipo: RelacionTipo.CIERRE_INVENTARIO },
    ]);
    expect((await fallo(resolver(consultas([pa]), { tipo: T.BAJA_ADMINISTRADOR, cantidad: 1, relaciones: [{ origenId: pa.movimientoId, cantidad: 1 }] }))).statusCode).toBe(400);
  });

  it("salidas, entradas y administrativos no consultan la BD y no admiten relaciones explícitas", async () => {
    for (const tipo of [T.PRESTAMO, T.RENTA_EXTERNA, T.ALTA, T.COMPRA, T.INVENTARIO]) {
      const c = consultas([origen({ saldo: 1 })]);
      expect(await resolver(c, { tipo, cantidad: 1 })).toEqual({ relaciones: [], cubiertoPorLegado: 0, sinOrigen: false });
      expect(c.origenesAbiertos).not.toHaveBeenCalled();
      expect((await fallo(resolver(c, { tipo, cantidad: 1, relaciones: [{ origenId: 1, cantidad: 1 }] }))).statusCode).toBe(400);
    }
  });
});
