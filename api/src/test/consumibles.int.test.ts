/**
 * Plan 04 · bloque A: expendables (productos CONSUMIBLES, decisión 18) y bajas por cantidad (decisión 19).
 */
import "./env";
import { Express } from "express";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import NotificacionService from "../services/NotificacionService";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoCompra, crearGrupoDetalle, inventarioDe } from "./factories";
import { SEMILLA } from "./seed";

const A = SEMILLA.proyectoAId;
const CONSUMIBLE = SEMILLA.productoTipoConsumibleId;

const relacionesDe = async (derivadoId: number) =>
  (await AppDataSource.query("SELECT origenId, cantidad, tipo FROM movimiento_relacion WHERE derivadoId = ? ORDER BY id", [derivadoId])).map(
    (r: any) => ({ origenId: Number(r.origenId), cantidad: Number(r.cantidad), tipo: r.tipo })
  );

describe("plan 04 · bloque A", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  const grupos: Record<string, number> = {};
  const grupo = async (tipo: number, proyectoId = A) => {
    const llave = `${tipo}-${proyectoId}`;
    grupos[llave] ??= (await crearGrupoDetalle(api, tipo, proyectoId)).id;
    return grupos[llave];
  };
  const articulo = async (cantidad: number, productoTipoId?: number) =>
    crearArticulo(api, { grupoId: await grupo(14), cantidad, movimientoTipoId: 14, productoTipoId });
  const operar = async (codigo: string, movimientoTipoId: number, cantidad: number, proyectoId: number | null = A, extra: Record<string, unknown> = {}) =>
    api.put("/groups/activity").send({
      codigo, cantidad, movimientoTipoId, proyectoId, usuariosIds: [SEMILLA.adminId], grupoId: await grupo(movimientoTipoId, proyectoId ?? A), ...extra,
    });
  const deshacer = (movimientoId: number) => api.delete("/groups/activity").send({ movimientoId });
  const abiertos = async (inventarioActualId: number) => (await api.get(`/activity/open-by-inventory/${inventarioActualId}`)).body;
  const pendientes = async () => {
    const res = await api.post("/groups/active-activity-list").send({
      proyectoId: A, usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId],
      sortField: "movimiento.id", pagination: { current: 1, pageSize: 1000 }, filters: {},
    });
    expect(res.status).toBe(200);
    return res.body.results as any[];
  };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
  });
  afterAll(cerrarPruebas);

  describe("expendables", () => {
    it("el préstamo se da por consumido: bajan ambas existencias y no queda pendiente de devolución", async () => {
      const { codigo, inventarioActualId } = await articulo(10, CONSUMIBLE);
      const prestamo = await operar(codigo, 3, 4);
      expect(prestamo.status).toBe(200);
      expect(prestamo.body).toMatchObject({ consumible: true, efectoCantidad: -4, efectoAlmacen: -4 });
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 6, cantidadAlmacen: 6, disponible: "disponible" });
      expect(await abiertos(inventarioActualId)).toEqual([]);
      expect((await api.get(`/activity/${prestamo.body.id}/chain`)).body.saldoPendiente).toBeNull();
      expect((await pendientes()).find((m) => m.id === prestamo.body.id)).toBeUndefined();
    });

    it("la devolución parcial ajusta las existencias y no se relaciona con el préstamo", async () => {
      const { codigo, inventarioActualId } = await articulo(10, CONSUMIBLE);
      await operar(codigo, 3, 4);
      const devolucion = await operar(codigo, 4, 1);
      expect(devolucion.status).toBe(200);
      expect(await relacionesDe(devolucion.body.id)).toEqual([]);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 7, cantidadAlmacen: 7, disponible: "disponible" });
    });

    it("se puede devolver sin préstamo previo y consumir todo sin quedar dado de baja", async () => {
      const { codigo, inventarioActualId } = await articulo(2, CONSUMIBLE);
      expect((await operar(codigo, 3, 2)).status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 0, cantidadAlmacen: 0, disponible: "no-disponible" });
      expect((await operar(codigo, 4, 3)).status).toBe(200); // regresa más de lo prestado: solo ajusta existencias
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 3, cantidadAlmacen: 3, disponible: "disponible" });
    });

    it("la COMPRA queda a nombre de la producción sin sumar existencias ni pendiente; lo devuelto sí suma", async () => {
      const compra = await crearArticulo(api, { grupoId: (await crearGrupoCompra(api)).id, cantidad: 6, productoTipoId: CONSUMIBLE });
      expect(compra.movimiento).toMatchObject({ consumible: true, efectoCantidad: 0, efectoAlmacen: 0 });
      expect(await inventarioDe(compra.inventarioActualId)).toMatchObject({ cantidad: 0, cantidadAlmacen: 0, disponible: "no-disponible" });
      expect(await abiertos(compra.inventarioActualId)).toEqual([]);
      expect((await operar(compra.codigo, 4, 2)).status).toBe(200);
      expect(await inventarioDe(compra.inventarioActualId)).toMatchObject({ cantidad: 2, cantidadAlmacen: 2, disponible: "disponible" });
    });

    it("no se transfieren (7, 12) ni admiten relaciones explícitas → 400", async () => {
      const { codigo } = await articulo(5, CONSUMIBLE);
      const prestamo = await operar(codigo, 3, 1);
      for (const tipo of [7, 12]) {
        const res = await operar(codigo, tipo, 1);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/NO SE TRANSFIEREN/);
      }
      const conRelacion = await operar(codigo, 4, 1, A, { relaciones: [{ origenId: prestamo.body.id, cantidad: 1 }] });
      expect(conRelacion.status).toBe(400);
    });

    it("deshacer el préstamo y la devolución restaura las existencias, aunque no sean el último movimiento", async () => {
      const { codigo, inventarioActualId } = await articulo(10, CONSUMIBLE);
      const prestamo = await operar(codigo, 3, 4);
      const devolucion = await operar(codigo, 4, 1);
      expect((await deshacer(prestamo.body.id)).status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 11, cantidadAlmacen: 11 });
      expect((await deshacer(devolucion.body.id)).status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 10, cantidadAlmacen: 10, disponible: "disponible" });
    });

    it("no genera aviso de préstamo vencido", async () => {
      const { codigo } = await articulo(3, CONSUMIBLE);
      const prestamo = await operar(codigo, 3, 1, A, { usuariosIds: [SEMILLA.operadorId] });
      await AppDataSource.query(
        "UPDATE operacion o INNER JOIN movimiento m ON m.operacionId = o.id SET o.fecha = '2020-01-01', m.fecha = '2020-01-01' WHERE m.id = ?",
        [prestamo.body.id]
      );
      await NotificacionService.avisarPrestamosVencidos(120);
      const avisos = await AppDataSource.query("SELECT id FROM notificacion WHERE clave = ?", [`prestamo-vencido:${prestamo.body.id}`]);
      expect(avisos).toEqual([]);
    });

    it("un producto regular sigue dejando pendiente (control)", async () => {
      const { codigo, inventarioActualId } = await articulo(5);
      const prestamo = await operar(codigo, 3, 3);
      expect(prestamo.body).toMatchObject({ consumible: false, efectoCantidad: -3, efectoAlmacen: 0 });
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 2, cantidadAlmacen: 5 });
      expect((await operar(codigo, 4, 1)).status).toBe(200);
      expect((await abiertos(inventarioActualId)).map((o: any) => o.saldo)).toEqual([2]);
    });
  });

  describe("cambio de tipo de producto", () => {
    const editar = (movimiento: any, productoTipoId?: number) => {
      const producto = movimiento.inventarioActual.producto;
      return api.put("/item/edit").send({ productoId: producto.id, areaId: SEMILLA.areaId, productoTipoId, titulo: producto.titulo, descripcion: producto.descripcion });
    };
    const tipoDe = async (movimiento: any) =>
      Number((await AppDataSource.query("SELECT productoTipoId FROM producto WHERE id = ?", [movimiento.inventarioActual.producto.id]))[0].productoTipoId);

    it("se rechaza con unidades fuera del almacén y se acepta con todas dentro", async () => {
      const { codigo, movimiento } = await articulo(3);
      await operar(codigo, 3, 1);
      const conPrestamo = await editar(movimiento, CONSUMIBLE);
      expect(conPrestamo.status).toBe(400);
      expect(conPrestamo.body.message).toMatch(/UNIDADES FUERA DEL ALMACÉN/);
      await operar(codigo, 4, 1);
      expect((await editar(movimiento, CONSUMIBLE)).status).toBe(200);
      expect(await tipoDe(movimiento)).toBe(CONSUMIBLE);
    });

    it("sin productoTipoId la edición conserva el tipo", async () => {
      const { movimiento } = await articulo(3, CONSUMIBLE);
      expect((await editar(movimiento)).status).toBe(200);
      expect(await tipoDe(movimiento)).toBe(CONSUMIBLE);
    });
  });

  describe("bajas por cantidad", () => {
    it("la baja sin proyecto (8) descuenta solo las unidades indicadas, primero del almacén", async () => {
      const { codigo, inventarioActualId } = await articulo(5);
      const prestamo = await operar(codigo, 3, 2);
      const baja = await operar(codigo, 8, 1, null);
      expect(baja.status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 2, cantidadAlmacen: 4, disponible: "disponible" });
      expect(await relacionesDe(baja.body.id)).toEqual([]); // salió del almacén: el préstamo sigue abierto
      expect((await abiertos(inventarioActualId)).map((o: any) => [o.movimientoId, o.saldo])).toEqual([[prestamo.body.id, 2]]);

      const resto = await operar(codigo, 17, 3, null); // 2 del almacén + 1 de lo prestado
      expect(resto.status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 0, cantidadAlmacen: 1, disponible: "no-disponible" });
      expect(await relacionesDe(resto.body.id)).toEqual([{ origenId: prestamo.body.id, cantidad: 1, tipo: "cierre-inventario" }]);

      const excede = await operar(codigo, 8, 2, null);
      expect(excede.status).toBe(400);
      expect(excede.body.message).toMatch(/EXCEDE LA EXISTENCIA/);
    });

    it("la baja con proyecto (13) descuenta de lo prestado y deja el artículo en baja solo al llegar a cero", async () => {
      const { codigo, inventarioActualId } = await articulo(5);
      const prestamo = await operar(codigo, 3, 3);
      const parcial = await operar(codigo, 13, 1);
      expect(parcial.status).toBe(200);
      expect(await relacionesDe(parcial.body.id)).toEqual([{ origenId: prestamo.body.id, cantidad: 1, tipo: "baja" }]);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 2, cantidadAlmacen: 4, disponible: "disponible" });
      expect((await abiertos(inventarioActualId)).map((o: any) => o.saldo)).toEqual([2]);

      const { codigo: unitario, inventarioActualId: invUnitario } = await articulo(1);
      await operar(unitario, 3, 1);
      expect((await operar(unitario, 16, 1)).status).toBe(200);
      expect(await inventarioDe(invUnitario)).toMatchObject({ cantidad: 0, cantidadAlmacen: 0, disponible: "baja" });
    });

    it("una baja parcial se deshace aunque haya movimientos posteriores", async () => {
      const { codigo, inventarioActualId } = await articulo(5);
      const baja = await operar(codigo, 8, 2, null);
      const prestamo = await operar(codigo, 3, 1);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 2, cantidadAlmacen: 3 });
      expect((await deshacer(baja.body.id)).status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 4, cantidadAlmacen: 5, disponible: "disponible" });
      expect((await deshacer(prestamo.body.id)).status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 5, cantidadAlmacen: 5 });
    });

    it("una baja anterior al plan 04 (sin deltas) se sigue deshaciendo con su instantánea, solo si es el último movimiento", async () => {
      const { codigo, inventarioActualId } = await articulo(3);
      const baja = await operar(codigo, 8, 3, null);
      await AppDataSource.query("UPDATE movimiento SET efectoCantidad = NULL, efectoAlmacen = NULL WHERE id = ?", [baja.body.id]);
      expect((await deshacer(baja.body.id)).status).toBe(200);
      expect(await inventarioDe(inventarioActualId)).toMatchObject({ cantidad: 3, cantidadAlmacen: 3, disponible: "disponible" });
    });
  });
});
