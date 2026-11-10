/**
 * Hallazgos M14, L19 y L12: conteos de los listados paginados, orden por defecto con joins y listas de proyectos
 * internos/externos filtradas en la consulta.
 */
import "./env";
import { Express } from "express";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, registrarOperacion } from "./factories";
import { SEMILLA } from "./seed";

describe("conteos de listados, orden por defecto y proyectos por tipo", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  let grupoAlta: number;
  let grupoPrestamo: number;
  const codigos: string[] = [];

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
    grupoAlta = (await crearGrupoDetalle(api, 14)).id;
    grupoPrestamo = (await crearGrupoDetalle(api, 3)).id;
    for (let i = 0; i < 3; i++) {
      const { codigo } = await crearArticulo(api, { grupoId: grupoAlta, cantidad: 1, movimientoTipoId: 14 });
      codigos.push(codigo);
      expect((await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 3, grupoId: grupoPrestamo })).status).toBe(200);
    }
  });
  afterAll(cerrarPruebas);

  it("M14: el catálogo por códigos devuelve en `filtered` el conteo filtrado, no el tamaño de la página", async () => {
    const res = await api
      .post("/current-inventory/list-catalog-codes")
      .send({ pagination: { current: 1, pageSize: 1 }, codigosBusqueda: codigos });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.filtered).toBe(3);
    expect(res.body.pagination).toMatchObject({ total: 3, totalItems: 3 });
  });

  it("M14: en los préstamos activos `filtered` coincide con el total filtrado de la paginación", async () => {
    const res = await api.post("/groups/active-activity-list").send({
      sortField: "movimiento.id",
      pagination: { current: 1, pageSize: 1 },
      filters: {},
      proyectoId: SEMILLA.proyectoAId,
      usuariosIds: [],
      areasIds: [SEMILLA.areaId],
      bodegasIds: [SEMILLA.bodegaId],
    });
    expect(res.status).toBe(200);
    expect(res.body.filtered).toBe(res.body.pagination.total);
    expect(res.body.filtered).toBeGreaterThanOrEqual(3);
  });

  it("M14: usuarios sin filtros: total y totalItems iguales", async () => {
    const res = await api.post("/user/list-antd").send({ pagination: { current: 1, pageSize: 1 }, filters: {} });
    expect(res.status).toBe(200);
    expect(res.body.filtered).toBe(res.body.pagination.totalItems);
    expect(res.body.filtered).toBeGreaterThanOrEqual(2);
  });

  it("L19: los listados con joins responden sin `sortField` y con un campo sin alias", async () => {
    const tabla = { pagination: { current: 1, pageSize: 5 }, filters: {} };
    const sinOrden = await api.post("/groups/list-antd").send(tabla);
    expect(sinOrden.status).toBe(200);
    expect(sinOrden.body.results.length).toBeGreaterThan(0);
    const sinAlias = await api.post("/groups/list-antd").send({ ...tabla, sortField: "id", sortOrder: "descend" });
    expect(sinAlias.status).toBe(200);
    const ids = sinAlias.body.results.map((g: { id: number }) => g.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  it("L12: list-names-outbound solo devuelve proyectos externos e inbound solo internos", async () => {
    const externos = (await api.get("/project/list-names-outbound")).body as { id: number; esExterno: boolean }[];
    const internos = (await api.get("/project/list-names-inbound")).body as { id: number; esExterno: boolean }[];
    expect(externos.map((p) => p.id)).toContain(3);
    expect(externos.every((p) => p.esExterno)).toBe(true);
    expect(internos.map((p) => p.id)).toEqual(expect.arrayContaining([SEMILLA.proyectoAId, SEMILLA.proyectoBId]));
    expect(internos.some((p) => p.esExterno)).toBe(false);
  });
});
