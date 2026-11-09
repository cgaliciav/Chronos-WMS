/**
 * El parche de rendimiento de TypeORM (helpers/parcheTypeorm.ts) debe generar EXACTAMENTE el mismo SQL que la
 * implementación original. Se ejecutan las mismas peticiones con y sin parche y se comparan todas las consultas.
 */
import "./env";
import { Express } from "express";
import { Logger } from "typeorm";
import { crearApp } from "../app";
import { aplicarParcheTypeorm, parcheTypeormActivo, quitarParcheTypeorm } from "../helpers/parcheTypeorm";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, registrarOperacion } from "./factories";
import { SEMILLA } from "./seed";

const consultas: string[] = [];
class Captura implements Logger {
  logQuery(query: string, parametros?: unknown[]) {
    consultas.push(`${query} -- ${JSON.stringify(parametros ?? [])}`);
  }
  logQueryError() {}
  logQuerySlow() {}
  logSchemaBuild() {}
  logMigration() {}
  log() {}
}

describe("parche de TypeORM: replacePropertyNames con caché", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  let movimientoId: number;
  let inventarioActualId: number;
  let grupoId: number;

  beforeAll(async () => {
    await conectarPruebas({ logging: ["query"], logger: new Captura() } as any);
    app = crearApp();
    api = clienteAdmin(app);
    grupoId = (await crearGrupoDetalle(api, 14)).id;
    const articulo = await crearArticulo(api, { grupoId, cantidad: 3, movimientoTipoId: 14 });
    inventarioActualId = articulo.inventarioActualId;
    const prestamo = await registrarOperacion(api, { codigo: articulo.codigo, cantidad: 1, movimientoTipoId: 3, grupoId: (await crearGrupoDetalle(api, 3)).id });
    movimientoId = prestamo.body.id;
  });
  afterAll(async () => {
    aplicarParcheTypeorm();
    await cerrarPruebas();
  });

  const tabla = { sortOrder: "descend", pagination: { current: 1, pageSize: 10 }, filters: { "grupo.nombre": ["G"] } };
  const peticiones = () => [
    () => api.post("/groups/list-antd").send({ ...tabla, sortField: "grupo.id" }),
    () => api.post("/groups/activity-list-by-group").send({ ...tabla, filters: {}, sortField: "movimiento.id", grupoId }),
    () => api.post("/groups/active-activity-list").send({ ...tabla, filters: {}, sortField: "movimiento.id", proyectoId: SEMILLA.proyectoAId, usuariosIds: [SEMILLA.adminId], areasIds: [SEMILLA.areaId], bodegasIds: [] }),
    () => api.get(`/activity/${movimientoId}`),
    () => api.get(`/activity/${movimientoId}/chain`),
    () => api.get(`/activity/history-by-current-inventory/${inventarioActualId}`),
    () => api.get(`/current-inventory/${inventarioActualId}`),
    () => api.post("/current-inventory/list-catalog-general").send({ pagination: { current: 1, pageSize: 10 }, textoBusqueda: "", areasIds: [SEMILLA.areaId], estados: [] }),
    () => api.get(`/groups/${grupoId}`),
    () => api.get("/user/current"),
  ];

  const capturar = async () => {
    const resultado: string[][] = [];
    for (const peticion of peticiones()) {
      consultas.length = 0;
      const res = await peticion();
      expect(res.status).toBe(200);
      resultado.push([...consultas]);
    }
    return resultado;
  };

  it("genera el mismo SQL que la implementación original", async () => {
    quitarParcheTypeorm();
    expect(parcheTypeormActivo()).toBe(false);
    const sinParche = await capturar();
    aplicarParcheTypeorm();
    expect(parcheTypeormActivo()).toBe(true);
    const conParche = await capturar();
    const conParcheOtraVez = await capturar(); // con la caché ya llena
    expect(conParche).toEqual(sinParche);
    expect(conParcheOtraVez).toEqual(sinParche);
    expect(sinParche.flat().length).toBeGreaterThan(20);
  });
});
