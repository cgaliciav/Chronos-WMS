/**
 * Medición de rendimiento (plan 02 · fase 4): siembra la BD de pruebas con artículos y operaciones y mide con
 * autocannon los cinco endpoints de lectura más usados, más el número de consultas SQL por petición.
 *
 *   npm run test:int:up            # o MariaDB local (docs/api/pruebas.md)
 *   npm run rendimiento            # DURACION=30 ARTICULOS=300 por defecto
 *
 * Borra y recrea la BD de .env.test (como test:int). Los resultados se copian a docs/api/rendimiento.md.
 */
import "./env";
import autocannon from "autocannon";
import { AddressInfo } from "net";
import { Logger } from "typeorm";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, registrarOperacion, tokenAdmin } from "./factories";
import { SEMILLA } from "./seed";

const DURACION = Number(process.env.DURACION ?? 30);
const ARTICULOS = Number(process.env.ARTICULOS ?? 300);

let consultas = 0;
class ContadorConsultas implements Logger {
  logQuery() {
    consultas++;
  }
  logQueryError() {}
  logQuerySlow() {}
  logSchemaBuild() {}
  logMigration() {}
  log() {}
}

(async () => {
  await conectarPruebas({ logging: ["query"], logger: new ContadorConsultas() } as any);
  const app = crearApp();
  const api = clienteAdmin(app);

  console.log(`Sembrando ${ARTICULOS} artículos…`);
  const grupoAlta = (await crearGrupoDetalle(api, 14)).id;
  const grupoPrestamo = (await crearGrupoDetalle(api, 3)).id;
  const grupoDevolucion = (await crearGrupoDetalle(api, 4)).id;
  let movimientoId = 0;
  for (let i = 0; i < ARTICULOS; i++) {
    const { codigo } = await crearArticulo(api, { grupoId: grupoAlta, cantidad: 3, movimientoTipoId: 14 });
    if (i % 2 === 0) {
      const prestamo = await registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamo });
      movimientoId = prestamo.body.id;
      if (i % 4 === 0) await registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 4, grupoId: grupoDevolucion });
    }
  }

  const tabla = { sortField: "movimiento.id", sortOrder: "descend", pagination: { current: 1, pageSize: 20 }, filters: {} };
  const ENDPOINTS: { nombre: string; method: "GET" | "POST"; path: string; body?: unknown }[] = [
    { nombre: "POST /groups/list-antd", method: "POST", path: "/groups/list-antd", body: { ...tabla, sortField: "grupo.id" } },
    { nombre: "POST /groups/activity-list-by-group", method: "POST", path: "/groups/activity-list-by-group", body: { ...tabla, grupoId: grupoAlta } },
    {
      nombre: "POST /groups/active-activity-list",
      method: "POST",
      path: "/groups/active-activity-list",
      body: { ...tabla, proyectoId: SEMILLA.proyectoAId, usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId] },
    },
    { nombre: "GET /activity/:id", method: "GET", path: `/activity/${movimientoId}` },
    {
      nombre: "POST /current-inventory/list-catalog-general",
      method: "POST",
      path: "/current-inventory/list-catalog-general",
      body: { pagination: { current: 1, pageSize: 20 }, textoBusqueda: "", areasIds: [SEMILLA.areaId], estados: [] },
    },
  ];

  const servidor = app.listen(0);
  const puerto = (servidor.address() as AddressInfo).port;
  const resultados = [];
  for (const e of ENDPOINTS) {
    const cuerpo = e.body === undefined ? undefined : JSON.stringify(e.body);
    const unaVez = await api[e.method === "GET" ? "get" : "post"](e.path).send(e.body as object);
    if (unaVez.status !== 200) throw new Error(`${e.nombre} → ${unaVez.status} ${JSON.stringify(unaVez.body)}`);
    consultas = 0;
    await api[e.method === "GET" ? "get" : "post"](e.path).send(e.body as object);
    const consultasPorPeticion = consultas;

    const r = await autocannon({
      url: `http://127.0.0.1:${puerto}${e.path}`,
      method: e.method,
      body: cuerpo,
      headers: { auth: tokenAdmin(), "content-type": "application/json" },
      connections: 10,
      duration: DURACION,
    });
    resultados.push({
      endpoint: e.nombre,
      "req/s": Math.round(r.requests.average),
      "p50 ms": r.latency.p50,
      "p99 ms": r.latency.p99,
      errores: r.errors + r.non2xx,
      consultas: consultasPorPeticion,
    });
  }
  servidor.close();
  console.table(resultados);
  console.log(`Node ${process.version} · ${ARTICULOS} artículos · ${DURACION} s por endpoint · 10 conexiones`);
  await new Promise((r) => setTimeout(r, 1000)); // deja terminar los logs que se escriben sin esperar
  await cerrarPruebas();
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
