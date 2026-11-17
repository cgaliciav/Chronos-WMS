/**
 * Plan 04 · bloque C: transformación de productos (decisión 20). Unidades de un artículo que tiene la producción se
 * transforman en uno o más productos nuevos, ligados al original y a cargo de esa producción.
 */
import "./env";
import { Express } from "express";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, inventarioDe } from "./factories";
import { SEMILLA } from "./seed";

const A = SEMILLA.proyectoAId;
const B = SEMILLA.proyectoBId;

describe("plan 04 · bloque C · transformación", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  const grupos: Record<string, number> = {};
  const grupo = async (tipo: number, proyectoId = A) => {
    const llave = `${tipo}-${proyectoId}`;
    grupos[llave] ??= (await crearGrupoDetalle(api, tipo, proyectoId)).id;
    return grupos[llave];
  };
  const articulo = async (cantidad: number, productoTipoId?: number) =>
    crearArticulo(api, { grupoId: await grupo(14), cantidad, movimientoTipoId: 14, productoTipoId, precio: 250 });
  const operar = async (codigo: string, movimientoTipoId: number, cantidad: number, proyectoId = A) =>
    api.put("/groups/activity").send({ codigo, cantidad, movimientoTipoId, proyectoId, usuariosIds: [SEMILLA.adminId], grupoId: await grupo(movimientoTipoId, proyectoId) });
  const transformar = async (codigo: string, cantidad: number, productos: Record<string, unknown>[], proyectoId = A) =>
    api.put("/groups/activity-transform").send({ codigo, cantidad, proyectoId, usuariosIds: [SEMILLA.adminId], grupoId: await grupo(18, proyectoId), productos });
  const abiertos = async (inventarioActualId: number) => (await api.get(`/activity/open-by-inventory/${inventarioActualId}`)).body as any[];
  const contar = async (tabla: string) => Number((await AppDataSource.query(`SELECT COUNT(*) AS n FROM ${tabla}`))[0].n);

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
  });
  afterAll(cerrarPruebas);

  it("transforma parte de las unidades que tiene la producción en dos productos nuevos ligados al original", async () => {
    const original = await articulo(5);
    const prestamo = await operar(original.codigo, 3, 3);
    const res = await transformar(original.codigo, 1, [
      { titulo: "Silla (antes banco)", descripcion: "Banco con respaldo", cantidad: 1 },
      { titulo: "Extensiones cortas", cantidad: 7 },
    ]);
    expect(res.status).toBe(200);
    const { origen, derivados } = res.body;
    expect(derivados).toHaveLength(2);

    // El original: una unidad menos, descontada de lo que tenía la producción (pendiente 3 → 2).
    expect(await inventarioDe(original.inventarioActualId)).toMatchObject({ cantidad: 2, cantidadAlmacen: 4, disponible: "disponible" });
    expect((await abiertos(original.inventarioActualId)).map((o) => [o.movimientoId, o.saldo])).toEqual([[prestamo.body.id, 2]]);
    expect(origen.operacion.movimientoTipo.id).toBe(18);

    // Los nuevos: producto propio con código distinto, a cargo de la producción (como una compra) y con el precio heredado.
    const nuevos = await Promise.all(derivados.map((d: any) => inventarioDe(d.inventarioActual.id)));
    expect(nuevos.map((n) => [n.cantidad, n.cantidadAlmacen, n.disponible])).toEqual([[0, 1, "no-disponible"], [0, 7, "no-disponible"]]);
    const productos = await AppDataSource.query(
      `SELECT p.titulo, p.areaId, p.productoTipoId, ia.bodegaId, pc.barras, pp.precio
         FROM inventario_actual ia INNER JOIN producto p ON p.id = ia.productoId
         INNER JOIN producto_clave pc ON pc.productoId = p.id INNER JOIN producto_precio pp ON pp.productoId = p.id
        WHERE ia.id IN (?) ORDER BY ia.id`,
      [derivados.map((d: any) => d.inventarioActual.id)]
    );
    expect(productos.map((p: any) => p.titulo)).toEqual(["Silla (antes banco)", "Extensiones cortas"]);
    expect(new Set(productos.map((p: any) => p.barras)).size).toBe(2);
    for (const p of productos) {
      expect(p).toMatchObject({ areaId: SEMILLA.areaId, productoTipoId: SEMILLA.productoTipoId, bodegaId: SEMILLA.bodegaId });
      expect(Number(p.precio)).toBe(250);
    }
    expect((await abiertos(derivados[1].inventarioActual.id)).map((o) => [o.movimientoTipoId, o.proyectoId, o.saldo])).toEqual([[19, A, 7]]);

    // Relaciones: el 18 consume saldo del préstamo, y cada 19 queda ligado al 18.
    const cadena = (await api.get(`/activity/${origen.id}/chain`)).body;
    expect(cadena.relacionesComoDerivado.map((r: any) => [r.origen.id, r.cantidad, r.tipo])).toEqual([[prestamo.body.id, 1, "baja"]]);
    expect(cadena.relacionesComoOrigen.map((r: any) => [r.derivado.id, r.cantidad, r.tipo])).toEqual([
      [derivados[0].id, 1, "transformacion"],
      [derivados[1].id, 7, "transformacion"],
    ]);

    // El producto nuevo se devuelve al almacén como cualquier compra.
    const codigoNuevo = productos[1].barras;
    expect((await operar(codigoNuevo, 4, 5)).status).toBe(200);
    expect(await inventarioDe(derivados[1].inventarioActual.id)).toMatchObject({ cantidad: 5, cantidadAlmacen: 7, disponible: "disponible" });
  });

  it("solo se transforma lo que tiene la producción: en almacén, de otra producción o más de lo que tiene → 400 y nada cambia", async () => {
    const original = await articulo(3);
    const antes = { productos: await contar("producto"), movimientos: await contar("movimiento") };
    const enAlmacen = await transformar(original.codigo, 1, [{ titulo: "Producto nuevo", cantidad: 1 }]);
    expect(enAlmacen.status).toBe(400);

    await operar(original.codigo, 3, 2, B);
    expect((await transformar(original.codigo, 1, [{ titulo: "Producto nuevo", cantidad: 1 }], A)).status).toBe(400);
    expect((await transformar(original.codigo, 3, [{ titulo: "Producto nuevo", cantidad: 1 }], B)).status).toBe(400);
    expect(await contar("producto")).toBe(antes.productos);
    expect(await contar("movimiento")).toBe(antes.movimientos + 1); // solo el préstamo
    expect(await inventarioDe(original.inventarioActualId)).toMatchObject({ cantidad: 1, cantidadAlmacen: 3 });
  });

  it("es atómica: si un producto nuevo falla no queda nada a medias", async () => {
    const original = await articulo(2);
    await operar(original.codigo, 3, 2);
    const antes = { productos: await contar("producto"), movimientos: await contar("movimiento"), relaciones: await contar("movimiento_relacion") };
    const res = await transformar(original.codigo, 1, [
      { titulo: "Producto bueno", cantidad: 1 },
      { titulo: "Producto con área inexistente", cantidad: 1, areaId: 999999 },
    ]);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await contar("producto")).toBe(antes.productos);
    expect(await contar("movimiento")).toBe(antes.movimientos);
    expect(await contar("movimiento_relacion")).toBe(antes.relaciones);
    expect(await inventarioDe(original.inventarioActualId)).toMatchObject({ cantidad: 0, cantidadAlmacen: 2 });
  });

  it("transformar todas las unidades deja el original dado de baja", async () => {
    const original = await articulo(1);
    await operar(original.codigo, 3, 1);
    expect((await transformar(original.codigo, 1, [{ titulo: "Silla nueva", cantidad: 1 }])).status).toBe(200);
    expect(await inventarioDe(original.inventarioActualId)).toMatchObject({ cantidad: 0, cantidadAlmacen: 0, disponible: "baja" });
  });

  it("los tipos 18 y 19 solo se registran desde activity-transform y no se deshacen", async () => {
    const original = await articulo(3);
    await operar(original.codigo, 3, 2);
    for (const tipo of [18, 19]) {
      const directo = await api.put("/groups/activity").send({ codigo: original.codigo, cantidad: 1, movimientoTipoId: tipo, proyectoId: A, usuariosIds: [SEMILLA.adminId], grupoId: await grupo(18) });
      expect(directo.status).toBe(400);
    }
    await expect(crearArticulo(api, { grupoId: await grupo(18), cantidad: 1, movimientoTipoId: 19 as any })).rejects.toThrow(/400/);

    const res = await transformar(original.codigo, 1, [{ titulo: "Producto nuevo", cantidad: 2 }]);
    expect(res.status).toBe(200);
    for (const id of [res.body.origen.id, res.body.derivados[0].id]) {
      const deshacer = await api.delete("/groups/activity").send({ movimientoId: id });
      expect(deshacer.status).toBe(409);
    }
  });

  it("valida el cuerpo: sin productos o sin proyecto → 400", async () => {
    const original = await articulo(1);
    expect((await transformar(original.codigo, 1, [])).status).toBe(400);
    const sinProyecto = await api.put("/groups/activity-transform").send({ codigo: original.codigo, cantidad: 1, grupoId: await grupo(18), productos: [{ titulo: "Producto", cantidad: 1 }] });
    expect(sinProyecto.status).toBe(400);
  });

  it("expendables: transformar un expendable no descuenta existencias (ya se consumió) y un producto nuevo expendable nace sin pendiente", async () => {
    const consumible = await articulo(10, SEMILLA.productoTipoConsumibleId);
    await operar(consumible.codigo, 3, 4); // consumido por la producción: 6/6
    const res = await transformar(consumible.codigo, 1, [{ titulo: "Extensiones recortadas", cantidad: 7 }]);
    expect(res.status).toBe(200);
    expect(await inventarioDe(consumible.inventarioActualId)).toMatchObject({ cantidad: 6, cantidadAlmacen: 6 });
    const nuevo = res.body.derivados[0].inventarioActual.id;
    expect(await inventarioDe(nuevo)).toMatchObject({ cantidad: 0, cantidadAlmacen: 0, disponible: "no-disponible" });
    expect(await abiertos(nuevo)).toEqual([]);
  });
});
