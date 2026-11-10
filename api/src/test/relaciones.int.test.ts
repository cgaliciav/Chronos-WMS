/**
 * Plan 02 · fase 3: relación origen→derivado entre movimientos, saldos, deshacer y modo de compatibilidad.
 */
import "./env";
import { Express } from "express";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoCompra, crearGrupoDetalle, inventarioDe, movimientosDe, registrarOperacion } from "./factories";
import { SEMILLA } from "./seed";

const A = SEMILLA.proyectoAId;
const B = SEMILLA.proyectoBId;

const relacionesDe = async (derivadoId: number) =>
  (await AppDataSource.query("SELECT origenId, cantidad, tipo FROM movimiento_relacion WHERE derivadoId = ? ORDER BY id", [derivadoId])).map(
    (r: any) => ({ origenId: Number(r.origenId), cantidad: Number(r.cantidad), tipo: r.tipo })
  );

describe("fase 3 · relación entre movimientos", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  const grupos: Record<string, number> = {};
  /** Grupo con detalle por (tipo, proyecto), creado una vez. */
  const grupo = async (tipo: number, proyectoId = A) => {
    const llave = `${tipo}-${proyectoId}`;
    grupos[llave] ??= (await crearGrupoDetalle(api, tipo, proyectoId)).id;
    return grupos[llave];
  };
  const articulo = async (cantidad: number) => crearArticulo(api, { grupoId: await grupo(14), cantidad, movimientoTipoId: 14 });
  const operar = async (codigo: string, movimientoTipoId: number, cantidad: number, proyectoId = A, extra: Record<string, unknown> = {}) =>
    api.put("/groups/activity").send({
      codigo, cantidad, movimientoTipoId, proyectoId, usuariosIds: [SEMILLA.adminId], grupoId: await grupo(movimientoTipoId, proyectoId), ...extra,
    });

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
  });
  afterAll(cerrarPruebas);

  it("préstamo de 5 → devoluciones de 2 y 3 → saldo 0 → una tercera devolución se rechaza", async () => {
    const { codigo, inventarioActualId } = await articulo(5);
    const prestamo = await operar(codigo, 3, 5);
    expect(prestamo.status).toBe(200);

    const d1 = await operar(codigo, 4, 2);
    expect(d1.status).toBe(200);
    expect(d1.body.relacionesComoDerivado).toEqual([expect.objectContaining({ origen: { id: prestamo.body.id }, cantidad: 2, tipo: "devolucion" })]);
    expect((await api.get(`/activity/${prestamo.body.id}/chain`)).body.saldoPendiente).toBe(3);

    const d2 = await operar(codigo, 4, 3);
    expect(d2.status).toBe(200);
    const cadena = (await api.get(`/activity/${prestamo.body.id}/chain`)).body;
    expect(cadena.saldoPendiente).toBe(0);
    expect(cadena.relacionesComoOrigen.map((r: any) => [r.derivado.id, r.cantidad])).toEqual([[d1.body.id, 2], [d2.body.id, 3]]);

    const d3 = await operar(codigo, 4, 1);
    expect(d3.status).toBe(400);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(5);
    expect((await api.get(`/activity/open-by-inventory/${inventarioActualId}`)).body).toEqual([]);
  });

  it("una devolución de 7 cubre dos préstamos (3 + 4) y crea dos relaciones, FIFO", async () => {
    const { codigo } = await articulo(7);
    const p3 = await operar(codigo, 3, 3);
    const p4 = await operar(codigo, 3, 4);
    const abiertos = (await api.get(`/activity/open-by-inventory/${p3.body.inventarioActual.id}?proyectoId=${A}`)).body;
    expect(abiertos.map((a: any) => [a.movimientoId, a.saldo])).toEqual([[p3.body.id, 3], [p4.body.id, 4]]);

    const devolucion = await operar(codigo, 4, 7);
    expect(devolucion.status).toBe(200);
    expect(await relacionesDe(devolucion.body.id)).toEqual([
      { origenId: p3.body.id, cantidad: 3, tipo: "devolucion" },
      { origenId: p4.body.id, cantidad: 4, tipo: "devolucion" },
    ]);
  });

  it("strict con dos préstamos abiertos responde 409 con las candidatas; con relaciones explícitas se respeta la elección", async () => {
    const { codigo } = await articulo(2);
    const p1 = await operar(codigo, 3, 1);
    const p2 = await operar(codigo, 3, 1);

    const conflicto = await operar(codigo, 4, 1, A, { strict: true });
    expect(conflicto.status).toBe(409);
    expect(conflicto.body.candidatas.map((c: any) => c.movimientoId)).toEqual([p1.body.id, p2.body.id]);

    const elegida = await operar(codigo, 4, 1, A, { relaciones: [{ origenId: p2.body.id, cantidad: 1 }] });
    expect(elegida.status).toBe(200);
    expect(await relacionesDe(elegida.body.id)).toEqual([{ origenId: p2.body.id, cantidad: 1, tipo: "devolucion" }]);

    const excede = await operar(codigo, 4, 1, A, { relaciones: [{ origenId: p2.body.id, cantidad: 1 }] });
    expect(excede.status).toBe(400); // p2 ya no tiene saldo
  });

  it("transferencia: préstamo en A → 7 en A → 12 en B (ligado al 7) → devolución en B (ligada al 12)", async () => {
    const { codigo, inventarioActualId } = await articulo(1);
    const prestamo = await operar(codigo, 3, 1, A);
    const origen = await operar(codigo, 7, 1, A);
    expect(origen.status).toBe(200);
    expect(await relacionesDe(origen.body.id)).toEqual([{ origenId: prestamo.body.id, cantidad: 1, tipo: "transferencia" }]);

    const destino = await operar(codigo, 12, 1, B);
    expect(destino.status).toBe(200);
    expect(await relacionesDe(destino.body.id)).toEqual([{ origenId: origen.body.id, cantidad: 1, tipo: "transferencia" }]);

    expect((await operar(codigo, 4, 1, A)).status).toBe(400); // en A ya no hay nada pendiente
    const devolucion = await operar(codigo, 4, 1, B);
    expect(devolucion.status).toBe(200);
    expect(await relacionesDe(devolucion.body.id)).toEqual([{ origenId: destino.body.id, cantidad: 1, tipo: "devolucion" }]);
    expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 1, cantidadAlmacen: 1, disponible: "disponible" });
  });

  it("deshacer un origen con derivados → 409; deshaciendo antes el derivado se recupera el saldo y luego se deshace el origen", async () => {
    const { codigo, inventarioActualId } = await articulo(3);
    const prestamo = await operar(codigo, 3, 2);
    const devolucion = await operar(codigo, 4, 1);

    const bloqueado = await api.delete("/groups/activity").send({ movimientoId: prestamo.body.id });
    expect(bloqueado.status).toBe(409);
    expect(bloqueado.body.derivados).toEqual([{ movimientoId: devolucion.body.id, cantidad: 1, tipo: "devolucion" }]);

    expect((await api.delete("/groups/activity").send({ movimientoId: devolucion.body.id })).status).toBe(200);
    expect((await api.get(`/activity/${prestamo.body.id}/chain`)).body.saldoPendiente).toBe(2);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(1);

    expect((await api.delete("/groups/activity").send({ movimientoId: prestamo.body.id })).status).toBe(200);
    expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 3, cantidadAlmacen: 3, disponible: "disponible" });
    const movimientos = await movimientosDe(inventarioActualId);
    expect(movimientos.map((m) => [m.operacion.movimientoTipo.id, m.estatus])).toEqual([[14, "activo"]]);
    const historico = await AppDataSource.query("SELECT COUNT(*) AS n FROM inventario_actual_historico WHERE idOriginal = ?", [inventarioActualId]);
    expect(Number(historico[0].n)).toBe(1); // solo la instantánea del alta: las de los movimientos deshechos se borran
  });

  it("compras y bajas solo se deshacen si son el último movimiento; restaurar usa la instantánea LIGADA", async () => {
    const compra = await crearArticulo(api, { grupoId: (await crearGrupoCompra(api)).id, cantidad: 2 });
    expect(await inventarioDe(compra.inventarioActualId)).toMatchObject({ cantidad: 0, cantidadAlmacen: 2, disponible: "no-disponible" });
    const devolucion = await operar(compra.codigo, 4, 2); // primera entrada al almacén, ligada a la compra
    expect(devolucion.status).toBe(200);
    expect(await relacionesDe(devolucion.body.id)).toEqual([{ origenId: compra.movimiento.id, cantidad: 2, tipo: "devolucion" }]);

    const baja = await operar(compra.codigo, 8, 1, null as any);
    expect(baja.status).toBe(200);
    expect(await inventarioDe(compra.inventarioActualId)).toMatchObject({ cantidad: 0, cantidadAlmacen: 0, disponible: "baja" });

    const antesDeLaBaja = await api.delete("/groups/activity").send({ movimientoId: devolucion.body.id });
    expect(antesDeLaBaja.status).toBe(409);
    expect(antesDeLaBaja.body.message).toMatch(/compra o baja/);

    expect((await api.delete("/groups/activity").send({ movimientoId: baja.body.id })).status).toBe(200);
    expect(await inventarioDe(compra.inventarioActualId)).toMatchObject({ cantidad: 2, cantidadAlmacen: 2, disponible: "disponible" });
  });

  it("la baja sin proyecto (8) cierra los préstamos abiertos del inventario", async () => {
    const { codigo, inventarioActualId } = await articulo(2);
    const prestamo = await operar(codigo, 3, 2);
    const baja = await operar(codigo, 8, 2, null as any);
    expect(baja.status).toBe(200);
    expect(await relacionesDe(baja.body.id)).toEqual([{ origenId: prestamo.body.id, cantidad: 2, tipo: "cierre-inventario" }]);
    expect((await api.get(`/activity/open-by-inventory/${inventarioActualId}`)).body).toEqual([]);
  });

  it("préstamo ANTERIOR a la migración (legado, sin relaciones): la devolución se acepta por compatibilidad y se registra", async () => {
    const { codigo, inventarioActualId } = await articulo(2);
    const prestamo = await operar(codigo, 3, 2);
    // Simula un movimiento anterior a la fase 3: marcado como legado por la migración y sin relaciones.
    await AppDataSource.query("UPDATE movimiento SET legado = 1 WHERE inventarioActualId = ?", [inventarioActualId]);
    expect((await api.get(`/activity/open-by-inventory/${inventarioActualId}`)).body).toEqual([]);

    const devolucion = await operar(codigo, 4, 1);
    expect(devolucion.status).toBe(200);
    expect(await relacionesDe(devolucion.body.id)).toEqual([]);
    expect((await operar(codigo, 4, 1)).status).toBe(200); // el saldo legado (2) aún cubre 1
    expect((await operar(codigo, 4, 1)).status).toBe(400); // ya no queda saldo legado
    expect((await api.get(`/activity/${prestamo.body.id}/chain`)).body.saldoPendiente).toBeNull();

    // El aviso se escribe en LogGeneral sin esperar a la respuesta: se sondea.
    let registrado = false;
    for (let intento = 0; intento < 40 && !registrado; intento++) {
      const avisos = await AppDataSource.query(
        "SELECT data FROM log_general WHERE tipo = 'advertencia' AND mensaje LIKE 'Modo de compatibilidad%' ORDER BY id DESC LIMIT 5"
      );
      registrado = avisos.some((a: any) => JSON.parse(a.data).movimientoId === devolucion.body.id);
      if (!registrado) await new Promise((r) => setTimeout(r, 50));
    }
    expect(registrado).toBe(true);
  });

  it("PUT /groups/activity-add-transaction aplica la operación a un movimiento de listado y acepta relaciones", async () => {
    const { codigo, inventarioActualId } = await articulo(2);
    const prestamo = await operar(codigo, 3, 2);
    const linea = await api.put("/groups/activity").send({ codigo, cantidad: 2, grupoId: await grupo(4) }); // sin tipo: línea sin operación
    expect(linea.status).toBe(200);

    const res = await api.put("/groups/activity-add-transaction").send({
      movimientoId: linea.body.id, movimientoTipoId: 4, proyectoId: A, usuariosIds: [SEMILLA.adminId],
      relaciones: [{ origenId: prestamo.body.id, cantidad: 2 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(linea.body.id);
    expect(await relacionesDe(linea.body.id)).toEqual([{ origenId: prestamo.body.id, cantidad: 2, tipo: "devolucion" }]);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(2);

    const otraVez = await api.put("/groups/activity-add-transaction").send({ movimientoId: linea.body.id, movimientoTipoId: 4, proyectoId: A });
    expect(otraVez.status).toBe(400);
    expect(otraVez.body.message).toMatch(/ya tiene una operación/);
  });

  it("GET /activity/:id incluye fecha, relaciones y saldoPendiente; un id inexistente responde 404", async () => {
    const { codigo } = await articulo(3);
    const prestamo = await operar(codigo, 3, 3);
    await operar(codigo, 4, 1);
    const res = await api.get(`/activity/${prestamo.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.fecha).toEqual(expect.any(String));
    expect(res.body.saldoPendiente).toBe(2);
    expect(res.body.relacionesComoOrigen).toHaveLength(1);
    expect(res.body.relacionesComoDerivado).toEqual([]);
    expect((await api.get("/activity/999999")).status).toBe(404);
  });

  it("si falla un paso intermedio no queda nada a medias (grupo inexistente → inventario intacto, sin movimiento)", async () => {
    const { codigo, inventarioActualId } = await articulo(2);
    const res = await api.put("/groups/activity").send({ codigo, cantidad: 1, movimientoTipoId: 3, proyectoId: A, grupoId: 999999 });
    expect(res.status).toBe(404);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(2);
    expect(await movimientosDe(inventarioActualId)).toHaveLength(1);
  });

  it("no se puede cambiar el proyecto de un listado cuyos movimientos ya tienen relaciones (409); sin relaciones sí", async () => {
    const { codigo } = await articulo(2);
    const listado = (await crearGrupoDetalle(api, 3, A)).id;
    const prestamo = await api.put("/groups/activity").send({ codigo, cantidad: 2, movimientoTipoId: 3, proyectoId: A, usuariosIds: [SEMILLA.adminId], grupoId: listado });
    expect(prestamo.status).toBe(200);
    const editar = (proyectoId: number) =>
      api.put("/groups/edit-details").send({ grupoId: listado, proyectoId, usuariosIds: [SEMILLA.adminId], movimientoTipoId: 3 });

    expect((await editar(A)).status).toBe(200); // mismo proyecto: permitido
    await operar(codigo, 4, 1); // la devolución queda relacionada con el préstamo
    const bloqueado = await editar(B);
    expect(bloqueado.status).toBe(409);
    expect(bloqueado.body.movimientos).toEqual([prestamo.body.id]);
    expect((await api.get(`/activity/${prestamo.body.id}`)).body.operacion.proyecto.id).toBe(A);

    const otro = await articulo(1);
    const libre = (await crearGrupoDetalle(api, 3, A)).id;
    await api.put("/groups/activity").send({ codigo: otro.codigo, cantidad: 1, movimientoTipoId: 3, proyectoId: A, grupoId: libre });
    expect((await api.put("/groups/edit-details").send({ grupoId: libre, proyectoId: B, usuariosIds: [], movimientoTipoId: 3 })).status).toBe(200);
  });

  describe("POST /groups/active-activity-list sobre v_movimiento_saldo", () => {
    const listar = async (extra: Record<string, unknown> = {}) => {
      const res = await api.post("/groups/active-activity-list").send({
        proyectoId: A, usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId],
        sortField: "movimiento.id", pagination: { current: 1, pageSize: 1000 }, filters: {}, ...extra,
      });
      expect(res.status).toBe(200);
      return res.body.results as any[];
    };

    it("lista cada salida abierta con su saldo pendiente y omite las ya devueltas", async () => {
      const { codigo } = await articulo(5);
      const p1 = await operar(codigo, 3, 2);
      const p2 = await operar(codigo, 3, 3);
      await operar(codigo, 4, 3); // FIFO: cierra p1 (2) y deja p2 con saldo 2
      const fila = (id: number) => (async () => (await listar()).find((m) => m.id === id))();
      expect(await fila(p1.body.id)).toBeUndefined();
      expect(await fila(p2.body.id)).toEqual(expect.objectContaining({ saldoPendiente: 2 }));
      expect(await fila(p2.body.id)).toEqual(expect.objectContaining({ operacion: expect.objectContaining({ proyecto: expect.objectContaining({ id: A }) }) }));
      expect((await listar({ proyectoId: B })).find((m) => m.id === p2.body.id)).toBeUndefined();
    });

    it("un inventario solo con movimientos legados se lista con la heurística anterior (saldoPendiente null)", async () => {
      const { codigo, inventarioActualId } = await articulo(1);
      const prestamo = await operar(codigo, 3, 1);
      await AppDataSource.query("UPDATE movimiento SET legado = 1 WHERE inventarioActualId = ?", [inventarioActualId]);
      expect((await listar()).find((m) => m.id === prestamo.body.id)).toEqual(expect.objectContaining({ saldoPendiente: null }));
    });

    it("filtra por usuarios de la operación", async () => {
      const { codigo } = await articulo(1);
      const prestamo = await operar(codigo, 3, 1, A, { usuariosIds: [SEMILLA.operadorId] });
      expect((await listar({ usuariosIds: [SEMILLA.operadorId] })).map((m) => m.id)).toContain(prestamo.body.id);
      expect((await listar({ usuariosIds: [SEMILLA.adminId] })).map((m) => m.id)).not.toContain(prestamo.body.id);
    });
  });
});
