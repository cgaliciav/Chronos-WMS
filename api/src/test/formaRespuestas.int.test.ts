/**
 * Plan 02 · fase 6: fija la FORMA del JSON (claves y tipos, no valores) de los endpoints que más usa el front. Se
 * grabó con TypeORM 0.2 antes de migrar a TypeORM 1.x: si la migración cambia una relación cargada, un `null` por un
 * objeto, un número por un texto o una clave que desaparece, la instantánea lo muestra.
 *
 * Los listados contienen filas de otras suites (el orden de ejecución varía), así que de cada listado se toma solo la
 * fila de los datos que crea esta prueba.
 */
import "./env";
import { Express } from "express";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, crearArticulo, crearGrupoDetalle, registrarOperacion } from "./factories";
import { SEMILLA } from "./seed";

type Forma = string | Forma[] | { [clave: string]: Forma };

/** Tipo de cada valor; de un arreglo, la forma combinada de sus elementos (unión de claves y de tipos). */
const forma = (valor: unknown): Forma => {
  if (valor === null) return "null";
  if (Array.isArray(valor)) return valor.length === 0 ? [] : [valor.map(forma).reduce(combinar)];
  if (typeof valor === "object") {
    const salida: { [clave: string]: Forma } = {};
    for (const clave of Object.keys(valor as object).sort()) salida[clave] = forma((valor as Record<string, unknown>)[clave]);
    return salida;
  }
  return typeof valor;
};

const combinar = (a: Forma, b: Forma): Forma => {
  if (JSON.stringify(a) === JSON.stringify(b)) return a;
  if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const salida: { [clave: string]: Forma } = {};
    for (const clave of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      salida[clave] = clave in a && clave in b ? combinar(a[clave], b[clave]) : `${forma2texto(a[clave] ?? b[clave])}?`;
    }
    return salida;
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.length === 0 ? b : b.length === 0 ? a : [combinar(a[0], b[0])];
  return [forma2texto(a), forma2texto(b)].sort().join(" | ");
};
const forma2texto = (f: Forma) => (typeof f === "string" ? f : JSON.stringify(f));

/** De un listado `{ results: [...] }` o un arreglo, deja solo las filas que cumplen `elegir`. */
const filas = (cuerpo: any, elegir: (fila: any) => boolean) => {
  const lista = Array.isArray(cuerpo) ? cuerpo : cuerpo.results;
  const elegidas = lista.filter(elegir);
  if (elegidas.length === 0) throw new Error(`ninguna fila propia entre ${lista.length}: ${JSON.stringify(lista[0])?.slice(0, 300)}`);
  return Array.isArray(cuerpo) ? elegidas : { ...cuerpo, results: elegidas, total: 0, totalFiltrado: 0 };
};

const tabla = (extra: object = {}) => ({
  sortOrder: "descend",
  pagination: { current: 1, pageSize: 200 },
  filters: {},
  ...extra,
});

describe("fase 6 · forma de las respuestas", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;
  let grupoAltaId: number;
  let grupoPrestamoId: number;
  let codigo: string;
  let inventarioActualId: number;
  let productoId: number;
  let altaId: number;
  let prestamoId: number;
  let devolucionId: number;
  const respuestas: Record<string, unknown> = {};

  /** Pide, comprueba el 200 y guarda la forma con su nombre. */
  const registrar = async (nombre: string, peticion: PromiseLike<any>, recorte?: (cuerpo: any) => unknown) => {
    const res = await peticion;
    if (res.status !== 200) throw new Error(`${nombre} → ${res.status} ${JSON.stringify(res.body)}`);
    try {
      respuestas[nombre] = forma(recorte ? recorte(res.body) : res.body);
    } catch (error) {
      throw new Error(`${nombre}: ${(error as Error).message}`);
    }
    return res.body;
  };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
    grupoAltaId = (await crearGrupoDetalle(api, 14)).id;
    grupoPrestamoId = (await crearGrupoDetalle(api, 3)).id;
    const grupoDevolucionId = (await crearGrupoDetalle(api, 4)).id;

    const articulo = await crearArticulo(api, { grupoId: grupoAltaId, cantidad: 3, movimientoTipoId: 14 });
    codigo = articulo.codigo;
    inventarioActualId = articulo.inventarioActualId;
    altaId = articulo.movimiento.id;
    productoId = (articulo.movimiento.inventarioActual as any).producto.id;
    respuestas["PUT /groups/activity-purchase"] = forma(articulo.movimiento);

    prestamoId = (
      await registrar(
        "PUT /groups/activity (préstamo)",
        registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamoId })
      )
    ).id;
    devolucionId = (
      await registrar(
        "PUT /groups/activity (devolución)",
        registrarOperacion(api, { codigo, cantidad: 1, movimientoTipoId: 4, grupoId: grupoDevolucionId })
      )
    ).id;
    await registrar("PUT /item/comment", api.put("/item/comment").send({ id: productoId, comentario: "Comentario de forma" }));
  });
  afterAll(cerrarPruebas);

  it("detalles", async () => {
    await registrar("GET /activity/:id (alta)", api.get(`/activity/${altaId}`));
    await registrar("GET /activity/:id (préstamo)", api.get(`/activity/${prestamoId}`));
    await registrar("GET /activity/:id (devolución)", api.get(`/activity/${devolucionId}`));
    await registrar("GET /activity/:id/chain", api.get(`/activity/${prestamoId}/chain`));
    await registrar("GET /activity/prior-activity/:id", api.get(`/activity/prior-activity/${inventarioActualId}`));
    await registrar("GET /activity/get-group/:id", api.get(`/activity/get-group/${prestamoId}`));
    await registrar("GET /activity/history-by-current-inventory/:id", api.get(`/activity/history-by-current-inventory/${inventarioActualId}`));
    await registrar("GET /activity/open-by-inventory/:id", api.get(`/activity/open-by-inventory/${inventarioActualId}`));
    await registrar("GET /groups/:id", api.get(`/groups/${grupoPrestamoId}`));
    await registrar("GET /current-inventory/:id", api.get(`/current-inventory/${inventarioActualId}`));
    await registrar("POST /current-inventory/get-activity-inventory", api.post("/current-inventory/get-activity-inventory").send({ inventarioActualId }));
    await registrar("GET /user/:id", api.get(`/user/${SEMILLA.adminId}`));
    await registrar("GET /user/current", api.get("/user/current"));
    await registrar("GET /user/get-areas", api.get("/user/get-areas"));
    await registrar("GET /user/get-warehouses", api.get("/user/get-warehouses"));
    await registrar("GET /user/get-projects", api.get("/user/get-projects"));
    await registrar("GET /project/:id", api.get(`/project/${SEMILLA.proyectoAId}`));
    await registrar("GET /warehouse/:id", api.get(`/warehouse/${SEMILLA.bodegaId}`));
    await registrar("GET /area/:id", api.get(`/area/${SEMILLA.areaId}`));
    await registrar("GET /supplier/:id", api.get(`/supplier/${SEMILLA.proveedorId}`));
    await registrar("GET /role/list-names", api.get("/role/list-names"));
    await registrar("GET /project/list-names", api.get("/project/list-names"));
    await registrar("GET /user/list-names-full", api.get("/user/list-names-full"), (b) => filas(b, (u) => u.id === SEMILLA.adminId));
  });

  it("listados", async () => {
    const delGrupo = (f: any) => [grupoAltaId, grupoPrestamoId].includes(f.id);
    const deMisMovimientos = (f: any) => [altaId, prestamoId, devolucionId].includes(f.id);
    const deMiInventario = (f: any) => f.id === inventarioActualId || f.inventarioActual?.id === inventarioActualId;
    await registrar("POST /groups/list-antd", api.post("/groups/list-antd").send(tabla({ sortField: "grupo.id" })), (b) => filas(b, delGrupo));
    await registrar(
      "POST /groups/activity-list-by-group",
      api.post("/groups/activity-list-by-group").send(tabla({ sortField: "movimiento.id", grupoId: grupoPrestamoId })),
      (b) => filas(b, deMisMovimientos)
    );
    await registrar(
      "POST /groups/active-activity-list",
      api.post("/groups/active-activity-list").send(
        tabla({ sortField: "movimiento.id", proyectoId: SEMILLA.proyectoAId, usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId] })
      ),
      (b) => filas(b, deMisMovimientos)
    );
    const catalogo = { pagination: { current: 1, pageSize: 500 }, textoBusqueda: "", areasIds: [SEMILLA.areaId] };
    await registrar(
      "POST /current-inventory/list-catalog-codes",
      api.post("/current-inventory/list-catalog-codes").send({ ...catalogo, codigosBusqueda: [codigo] }),
      (b) => filas(b, deMiInventario)
    );
    await registrar("POST /user/list-antd", api.post("/user/list-antd").send(tabla()), (b) => filas(b, (u) => u.id === SEMILLA.adminId));
    await registrar("POST /project/list-antd", api.post("/project/list-antd").send(tabla()), (b) => filas(b, (p) => p.id === SEMILLA.proyectoAId));
  });

  it("coinciden con la instantánea grabada con TypeORM 0.2", () => {
    // Una sola instantánea con todas las formas, para leer el cambio completo de un vistazo.
    expect(respuestas).toMatchSnapshot();
  });
});
