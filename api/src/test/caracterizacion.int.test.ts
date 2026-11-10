/**
 * Pruebas de CARACTERIZACIÓN (plan 02, fase 1): fijan el comportamiento actual del API antes de
 * cambiarlo. Donde el comportamiento actual es incorrecto se usa `it.failing` con la expectativa
 * correcta: cuando alguien lo arregle, la prueba pasará a rojo y habrá que quitar el `failing`.
 */
import "./env";
import { Express } from "express";
import supertest from "supertest";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import { Sesion } from "../entity/Sesion";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import {
  clienteAdmin,
  crearArticulo,
  crearGrupoCompra,
  crearGrupoDetalle,
  inventarioDe,
  movimientosDe,
  registrarOperacion,
} from "./factories";
import { SEMILLA } from "./seed";

const esperarHasta = async <T>(fn: () => Promise<T>, condicion: (v: T) => boolean, ms = 3000) => {
  const inicio = Date.now();
  let valor = await fn();
  while (!condicion(valor) && Date.now() - inicio < ms) {
    await new Promise((r) => setTimeout(r, 50));
    valor = await fn();
  }
  return valor;
};

describe("caracterización: operaciones de almacén", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  let grupoCompraId: number;
  let grupoAltaId: number;
  let grupoPrestamoAId: number;
  let grupoDevolucionAId: number;
  let grupoDevolucionBId: number;

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
    grupoCompraId = (await crearGrupoCompra(api)).id;
    grupoAltaId = (await crearGrupoDetalle(api, 14)).id;
    grupoPrestamoAId = (await crearGrupoDetalle(api, 3, SEMILLA.proyectoAId)).id;
    grupoDevolucionAId = (await crearGrupoDetalle(api, 4, SEMILLA.proyectoAId)).id;
    grupoDevolucionBId = (await crearGrupoDetalle(api, 4, SEMILLA.proyectoBId)).id;
  });
  afterAll(cerrarPruebas);

  // 1
  it("COMPRA (15) de 5 unidades deja el artículo no disponible con cantidad 0 y guarda el detalle de precios", async () => {
    const { movimiento, inventarioActualId } = await crearArticulo(api, { grupoId: grupoCompraId, cantidad: 5, precio: 200 });
    const inv = await inventarioDe(inventarioActualId);
    expect(inv.cantidad).toBe(0);
    expect(inv.disponible).toBe("no-disponible");
    expect(movimiento.operacion.operacionDetalle).toEqual(
      expect.objectContaining({ precioUnitario: 200, precioTotal: 1000, moneda: "MXP" })
    );
    expect(movimiento.operacion.movimientoTipo.id).toBe(15);
  });

  it("COMPRA (15) de 5 unidades deja cantidadAlmacen = 5 (antes 5.0001: suma string + número y doble incremento, H18/H21)", async () => {
    const { inventarioActualId } = await crearArticulo(api, { grupoId: grupoCompraId, cantidad: 5, precio: 200 });
    expect((await inventarioDe(inventarioActualId)).cantidadAlmacen).toBe(5);
  });

  // 2
  it("ALTA (14) de 3 unidades deja el artículo disponible con 3/3", async () => {
    const { inventarioActualId } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 3, movimientoTipoId: 14 });
    const inv = await inventarioDe(inventarioActualId);
    expect(inv.cantidad).toBe(3);
    expect(inv.cantidadAlmacen).toBe(3);
    expect(inv.disponible).toBe("disponible");
  });

  // 3
  it("PRÉSTAMO (3) de 2 sobre 3 deja 1; DEVOLUCIÓN (4) de 2 regresa a 3; una devolución extra se rechaza", async () => {
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 3, movimientoTipoId: 14 });

    const prestamo = await registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamoAId });
    expect(prestamo.status).toBe(200);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(1);

    const devolucion = await registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 4, grupoId: grupoDevolucionAId });
    expect(devolucion.status).toBe(200);
    const inv = await inventarioDe(inventarioActualId);
    expect(inv.cantidad).toBe(3);
    expect(inv.disponible).toBe("disponible");

    const extra = await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 4, grupoId: grupoDevolucionAId });
    expect(extra.status).toBe(400);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(3);

    const movimientos = await movimientosDe(inventarioActualId);
    expect(movimientos.map((m) => m.operacion?.movimientoTipo.id)).toEqual([14, 3, 4]);
    expect(movimientos.map((m) => m.estatus)).toEqual(["inactivo", "inactivo", "activo"]);
  });

  // 4 — fase 3: 400 (antes 401, que no es un error de autorización); el mensaje se conserva
  it("una DEVOLUCIÓN en un proyecto distinto al del préstamo se rechaza", async () => {
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 1, movimientoTipoId: 14 });
    expect((await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 3, grupoId: grupoPrestamoAId })).status).toBe(200);

    const res = await registrarOperacion(api, {
      codigo, cantidad: 1, movimientoTipoId: 4, grupoId: grupoDevolucionBId, proyectoId: SEMILLA.proyectoBId,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no pertenece al proyecto/);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(0);
  });

  // 5
  it("un PRÉSTAMO sin existencia se rechaza con 400", async () => {
    const { codigo } = await crearArticulo(api, { grupoId: grupoCompraId, cantidad: 1 }); // compra: cantidad 0
    const res = await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 3, grupoId: grupoPrestamoAId });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/NO HAY EXISTENCIA/);
  });

  it("no se pueden crear artículos (tipos 1, 2, 14, 15) desde PUT /groups/activity", async () => {
    const { codigo } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 1, movimientoTipoId: 14 });
    const res = await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 14, grupoId: grupoAltaId });
    expect(res.status).toBe(400);
  });

  // 6a
  it("deshacer el ÚLTIMO movimiento restaura el inventario", async () => {
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 3, movimientoTipoId: 14 });
    const prestamo = await registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamoAId });
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(1);

    const res = await api.delete("/groups/activity").send({ movimientoId: prestamo.body.id });
    expect(res.status).toBe(200);
    // el borrado no se espera en el servidor (hallazgo H13): hay que sondear
    const movimientos = await esperarHasta(() => movimientosDe(inventarioActualId), (m) => m.length === 1);
    expect(movimientos).toHaveLength(1);
    const inv = await esperarHasta(() => inventarioDe(inventarioActualId), (i) => i.cantidad === 3);
    expect(inv.cantidad).toBe(3);
    expect(inv.disponible).toBe("disponible");
    expect(movimientos[0].estatus).toBe("activo"); // el alta vuelve a ser el movimiento activo
  });

  // 6b — corregido en la fase 3: las salidas se deshacen con su efecto inverso (hallazgo H17)
  it("deshacer el PENÚLTIMO movimiento deja el inventario coherente", async () => {
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 5, movimientoTipoId: 14 });
    const prestamo1 = await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 3, grupoId: grupoPrestamoAId });
    const prestamo2 = await registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamoAId });
    expect(prestamo1.status).toBe(200);
    expect(prestamo2.status).toBe(200);
    expect((await inventarioDe(inventarioActualId)).cantidad).toBe(2);

    await api.delete("/groups/activity").send({ movimientoId: prestamo1.body.id });
    await esperarHasta(() => movimientosDe(inventarioActualId), (m) => m.length === 2);
    const inv = await esperarHasta(() => inventarioDe(inventarioActualId), (i) => i.cantidad !== 2);
    // 5 - 2 (el préstamo que sigue vigente) = 3. Antes devolvía 4 (instantánea previa al préstamo 2).
    expect(inv.cantidad).toBe(3);
  });

  // 7 — corregido en la fase 3: transacción + SELECT … FOR UPDATE (hallazgo C7)
  it("cuatro PRÉSTAMOS concurrentes sobre una sola unidad: exactamente uno tiene éxito", async () => {
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 1, movimientoTipoId: 14 });
    const intentos = await Promise.all(
      Array.from({ length: 4 }, () => registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 3, grupoId: grupoPrestamoAId }))
    );
    const estados = intentos.map((r) => r.status);
    const exitos = estados.filter((s) => s === 200).length;
    const inv = await inventarioDe(inventarioActualId);
    const activos = (await movimientosDe(inventarioActualId)).filter((m) => m.estatus === "activo").length;
    expect(exitos).toBe(1);
    expect(estados.filter((s) => s === 400)).toHaveLength(3);
    expect(inv.cantidad).toBe(0);
    expect(activos).toBe(1);
  });

  // 8
  it("POST /groups/active-activity-list devuelve el préstamo pendiente", async () => {
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 1, movimientoTipoId: 14 });
    const prestamo = await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 3, grupoId: grupoPrestamoAId });
    expect(prestamo.status).toBe(200);

    const res = await api.post("/groups/active-activity-list").send({
      proyectoId: SEMILLA.proyectoAId,
      usuariosIds: [],
      areasIds: [SEMILLA.areaId],
      bodegasIds: [SEMILLA.bodegaId],
      sortField: "movimiento.id",
      pagination: { current: 1, pageSize: 100 },
      filters: {},
    });
    expect(res.status).toBe(200);
    const ids = res.body.results.map((m: any) => m.inventarioActual.id);
    expect(ids).toContain(inventarioActualId);
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(1);
  });

  it("POST /groups/active-activity-list sin sortField responde 200 (antes 500: ORDER BY id ambiguo, M33)", async () => {
    const res = await api.post("/groups/active-activity-list").send({
      proyectoId: SEMILLA.proyectoAId, usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId],
      pagination: { current: 1, pageSize: 10 }, filters: {},
    });
    expect(res.status).toBe(200);
  });

  // 9
  it("PUT /groups/edit-purchase cambia el proyecto de las operaciones del grupo (hoy sin esperar las promesas)", async () => {
    const grupo = await crearGrupoCompra(api, SEMILLA.proyectoAId);
    const { inventarioActualId } = await crearArticulo(api, { grupoId: grupo.id, cantidad: 1 });
    const res = await api.put("/groups/edit-purchase").send({
      grupoId: grupo.id,
      proyectoId: SEMILLA.proyectoBId,
      usuariosIds: [SEMILLA.adminId],
      numero: `${grupo.nombre}-E`,
      fechaEmision: "2026-02-01",
      total: 100,
      impuestos: 16,
      montoIngresado: 100,
      proveedorId: SEMILLA.proveedorId,
      facturaTipoId: SEMILLA.facturaTipoId,
    });
    expect(res.status).toBe(200);
    const movimientos = await esperarHasta(
      () =>
        AppDataSource.getRepository("Movimiento" as any)
          .createQueryBuilder("m")
          .leftJoinAndSelect("m.operacion", "o")
          .leftJoinAndSelect("o.proyecto", "p")
          .where("m.inventarioActualId = :id", { id: inventarioActualId })
          .getMany() as Promise<any[]>,
      (m) => m[0]?.operacion?.proyecto?.id === SEMILLA.proyectoBId
    );
    expect(movimientos[0].operacion.proyecto.id).toBe(SEMILLA.proyectoBId);
  });

  // 10
  it("el login ignora la IP del body y guarda la de la conexión (o la de X-Forwarded-For desde un proxy confiable)", async () => {
    const directo = await supertest(app).post("/auth/login").send({ c: SEMILLA.adminCorreo, p: SEMILLA.adminPassword, ip: "203.0.113.9" });
    expect(directo.status).toBe(200);
    const ultimaSesion = async () => (await AppDataSource.getRepository(Sesion).find({ order: { id: "DESC" }, take: 1 }))[0];
    let sesion = await ultimaSesion();
    expect(sesion.IP).not.toBe("203.0.113.9");
    expect(sesion.IP).toMatch(/127\.0\.0\.1|::1|::ffff:127\.0\.0\.1/);

    // TRUST_PROXY=loopback (por defecto): la cabecera del proxy local sí se respeta
    const viaProxy = await supertest(app)
      .post("/auth/login")
      .set("X-Forwarded-For", "198.51.100.7")
      .send({ c: SEMILLA.adminCorreo, p: SEMILLA.adminPassword });
    expect(viaProxy.status).toBe(200);
    sesion = await ultimaSesion();
    expect(sesion.IP).toBe("198.51.100.7");
  });
});
