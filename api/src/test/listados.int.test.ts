/**
 * Decisiones 11 y 12 (2026-11-08): un listado es del tipo de movimiento que contiene, los listados de bajas son
 * de BAJA JUSTIFICADA (13) o INJUSTIFICADA (16) y los inventarios/ajustes (6, 9, 10) no son movimientos.
 */
import "./env";
import { Express } from "express";
import { getConnection } from "typeorm";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, movimientosDe, nombreUnico, registrarOperacion } from "./factories";
import { SEMILLA } from "./seed";

describe("listados tipados y tipos que no son movimientos", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  let grupoAlta: number;
  let grupoPrestamo: number;

  const nuevoListado = (movimientoTipoId: number) =>
    api.post("/groups/new-details").send({ nombre: nombreUnico(`L${movimientoTipoId}`), proyectoId: SEMILLA.proyectoAId, movimientoTipoId, usuariosIds: [SEMILLA.adminId] });
  const editarListado = (grupoId: number, movimientoTipoId: number, proyectoId = SEMILLA.proyectoAId) =>
    api.put("/groups/edit-details").send({ grupoId, proyectoId, movimientoTipoId, usuariosIds: [SEMILLA.adminId] });
  /** Artículo prestado al proyecto A, listo para darlo de baja. */
  const prestado = async () => {
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAlta, cantidad: 1, movimientoTipoId: 14 });
    expect((await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 3, grupoId: grupoPrestamo })).status).toBe(200);
    return { codigo, inventarioActualId };
  };
  const tiposDe = async (inventarioActualId: number) => (await movimientosDe(inventarioActualId)).map((m) => m.operacion?.movimientoTipo.id);

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
    grupoAlta = (await crearGrupoDetalle(api, 14)).id;
    grupoPrestamo = (await crearGrupoDetalle(api, 3)).id;
  });
  afterAll(cerrarPruebas);

  it("no se crean listados de BAJA* (5) ni de inventario/ajuste (6, 9, 10); sí de 13 y 16", async () => {
    const baja = await nuevoListado(5);
    expect(baja.status).toBe(400);
    expect(baja.body.message).toMatch(/JUSTIFICADA \(13\) o BAJA INJUSTIFICADA \(16\)/);
    for (const tipo of [6, 9, 10]) {
      const r = await nuevoListado(tipo);
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/no es un movimiento de almacén/);
    }
    expect((await nuevoListado(13)).status).toBe(200);
    expect((await nuevoListado(16)).status).toBe(200);
  });

  it("las líneas de un listado son de su tipo: una baja injustificada no entra en un listado de justificadas", async () => {
    const listado = (await nuevoListado(13)).body.id;
    const { codigo, inventarioActualId } = await prestado();
    const injustificada = await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 16, grupoId: listado });
    expect(injustificada.status).toBe(400);
    expect(injustificada.body.message).toMatch(/solo admite movimientos de ese tipo/);
    expect(await tiposDe(inventarioActualId)).toEqual([14, 3]); // nada a medias

    expect((await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 13, grupoId: listado })).status).toBe(200);
    expect(await tiposDe(inventarioActualId)).toEqual([14, 3, 13]);
  });

  it("PUT /groups/activity-add-transaction respeta el tipo de los listados que ya contienen la línea", async () => {
    const listado = (await nuevoListado(13)).body.id;
    const { codigo } = await prestado();
    const linea = await api.put("/groups/activity").send({ codigo, cantidad: 1, grupoId: listado }); // línea sin operación
    expect(linea.status).toBe(200);
    const res = await api.put("/groups/activity-add-transaction").send({ movimientoId: linea.body.id, movimientoTipoId: 16, proyectoId: SEMILLA.proyectoAId });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/solo admite movimientos de ese tipo/);
  });

  it("ninguna operación de inventario o ajuste (6, 9, 10) se registra", async () => {
    const libre = (await api.post("/groups/new").send({ nombre: nombreUnico("LIBRE") })).body.id;
    const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAlta, cantidad: 1, movimientoTipoId: 14 });
    for (const tipo of [6, 9, 10]) {
      const r = await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: tipo, grupoId: libre });
      expect(r.status).toBe(400);
    }
    expect(await tiposDe(inventarioActualId)).toEqual([14]);
  });

  it("cambiar un listado de justificadas a injustificadas cambia todas sus líneas; cambiar a otro tipo con líneas → 400 sin tocar nada", async () => {
    const listado = (await nuevoListado(13)).body.id;
    const { codigo, inventarioActualId } = await prestado();
    expect((await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 13, grupoId: listado })).status).toBe(200);

    expect((await editarListado(listado, 16)).status).toBe(200);
    expect(await tiposDe(inventarioActualId)).toEqual([14, 3, 16]);

    const otroTipo = await editarListado(listado, 4); // mismo proyecto: lo que se rechaza es el tipo
    expect(otroTipo.status).toBe(400);
    expect(otroTipo.body.message).toMatch(/solo entre baja justificada e injustificada/);
    expect((await editarListado(listado, 16, SEMILLA.proyectoBId)).status).toBe(409); // proyecto con relaciones (fase 3)
    expect(await tiposDe(inventarioActualId)).toEqual([14, 3, 16]);
    const detalle = await getConnection().query(
      "SELECT gd.movimientoTipoId, gd.proyectoId FROM grupo g JOIN grupo_detalle gd ON gd.id = g.grupoDetalleId WHERE g.id = ?",
      [listado]
    );
    expect(detalle[0]).toEqual({ movimientoTipoId: 16, proyectoId: SEMILLA.proyectoAId });
  });

  describe("listados antiguos de BAJA* (5)", () => {
    let listado: number;
    beforeAll(async () => {
      listado = (await nuevoListado(13)).body.id;
      // Simula un listado creado antes de la decisión 11.
      await getConnection().query(
        "UPDATE grupo_detalle gd JOIN grupo g ON g.grupoDetalleId = gd.id SET gd.movimientoTipoId = 5 WHERE g.id = ?",
        [listado]
      );
    });

    it("siguen admitiendo bajas justificadas e injustificadas", async () => {
      const a = await prestado();
      const b = await prestado();
      expect((await registrarOperacion(api, { codigo: a.codigo, cantidad: 1, movimientoTipoId: 13, grupoId: listado })).status).toBe(200);
      expect((await registrarOperacion(api, { codigo: b.codigo, cantidad: 1, movimientoTipoId: 16, grupoId: listado })).status).toBe(200);
      const c = await prestado();
      expect((await registrarOperacion(api, { codigo: c.codigo, cantidad: 1, movimientoTipoId: 5, grupoId: listado })).status).toBe(400);
    });

    it("se pueden editar (proyecto y responsables) conservando el tipo de cada línea", async () => {
      const res = await editarListado(listado, 5);
      expect(res.status).toBe(200);
      const tipos = await getConnection().query(
        `SELECT o.movimientoTipoId AS tipo FROM grupo_movimientos_movimiento gm JOIN movimiento m ON m.id = gm.movimientoId
          JOIN operacion o ON o.id = m.operacionId WHERE gm.grupoId = ? ORDER BY m.id`,
        [listado]
      );
      expect(tipos.map((t: any) => Number(t.tipo))).toEqual([13, 16]);
    });

    it("no se puede poner el tipo 5 a un listado que no lo tenía", async () => {
      const otro = (await nuevoListado(16)).body.id;
      expect((await editarListado(otro, 5)).status).toBe(400);
    });
  });
});
