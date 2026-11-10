/** Pruebas de la fase 2 del plan 02: seguridad y errores corregidos. */
import "./env";
import { Express } from "express";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import supertest from "supertest";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import { Usuario } from "../entity/Usuario";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, clienteOperador, crearArticulo, crearGrupoCompra, crearGrupoDetalle, inventarioDe, movimientosDe, nombreUnico, registrarOperacion, tokenAdmin } from "./factories";
import { SEMILLA } from "./seed";

// PNG de 1x1 píxel
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

describe("fase 2 · seguridad", () => {
  let app: Express;
  let api: ReturnType<typeof clienteAdmin>;

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    api = clienteAdmin(app);
    mkdirSync(process.env.RUTA_REPORTES, { recursive: true });
    writeFileSync(join(process.env.RUTA_REPORTES, "reporte-prueba.xlsx"), "contenido");
  });
  afterAll(cerrarPruebas);

  describe("archivos", () => {
    let archivoId: number;

    it("subir un archivo a un grupo exige relación permitida y devuelve la estructura de antd", async () => {
      const grupo = await crearGrupoDetalle(api, 3);
      const res = await api.post("/file/file").field("relacion", "Grupo").field("id", String(grupo.id)).attach("file", PNG_1x1, "foto ../../x.png");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "done", type: "image/png" });
      expect(res.body.name).toBe("x.png"); // nombre saneado
      expect(res.body.thumbUrl).toMatch(/\/file\/thumbnail\//);
      archivoId = Number(res.body.url.split("/").pop());

      const otra = await api.post("/file/file").field("relacion", "Sesion").field("id", "1").attach("file", PNG_1x1, "a.png");
      expect(otra.status).toBe(400);
    });

    it("GET /file/:id exige token (cabecera o ?auth=) y lo sirve con token", async () => {
      expect((await supertest(app).get(`/file/${archivoId}`)).status).toBe(401);
      const conCabecera = await api.get(`/file/${archivoId}`);
      expect(conCabecera.status).toBe(200);
      expect(conCabecera.headers["content-type"]).toMatch(/image\/png/);
      const conQuery = await supertest(app).get(`/file/${archivoId}?auth=${tokenAdmin()}`);
      expect(conQuery.status).toBe(200);
      const miniatura = await api.get(`/file/thumbnail/${archivoId}`);
      expect(miniatura.status).toBe(200);
    });

    it("GET /file/report/:id no permite recorrer directorios y exige token", async () => {
      expect((await supertest(app).get("/file/report/reporte-prueba.xlsx")).status).toBe(401);
      const ok = await api.get("/file/report/reporte-prueba.xlsx");
      expect(ok.status).toBe(200);
      const traversal = await api.get("/file/report/..%2F..%2Fetc%2Fpasswd");
      expect(traversal.status).toBe(404);
      const traversal2 = await api.get("/file/report/..%2Freporte-prueba.xlsx");
      expect([200, 404]).toContain(traversal2.status); // basename → reporte-prueba.xlsx, nunca fuera de RUTA_REPORTES
      expect((await api.get("/file/report/.env")).status).toBe(404);
    });

    it("DELETE /file/:id responde y borra", async () => {
      const res = await api.delete(`/file/${archivoId}`);
      expect(res.status).toBe(200);
      expect((await api.get(`/file/${archivoId}`)).status).toBe(404);
    });
  });

  describe("contraseñas y sesión", () => {
    it("PUT /user/renewpassword ya no devuelve la contraseña", async () => {
      const res = await api.put("/user/renewpassword").send({ email: SEMILLA.operadorCorreo });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ correo: SEMILLA.operadorCorreo, enviado: true });
      expect(JSON.stringify(res.body)).not.toMatch(/"c"/);
      // la contraseña anterior ya no sirve
      const login = await supertest(app).post("/auth/login").send({ c: SEMILLA.operadorCorreo, p: SEMILLA.operadorPassword });
      expect(login.status).toBe(401);
    });

    it("POST /user/new ignora password/estatus/id del body y valida el correo", async () => {
      const correo = `${nombreUnico("u").toLowerCase()}@pruebas.local`;
      const res = await api.post("/user/new").send({
        nombre: "Nuevo Usuario", correo, vencimiento: "2027-12-31", rolesIds: [2], proyectosIds: [], bodegasIds: [], areasIds: [],
        password: "Pwned123!", estatus: "inactivo", id: 999,
      });
      expect(res.status).toBe(200);
      const creado = await AppDataSource.getRepository(Usuario).findOneOrFail({ where: { correo }, select: { id: true, password: true, estatus: true } });
      expect(creado.estatus).toBe("activo");
      expect(creado.id).not.toBe(999);
      expect(creado.checkIfUnencryptedPasswordIsValid("Pwned123!")).toBe(false);

      const invalido = await api.post("/user/new").send({ nombre: "X", correo: "no-es-correo", vencimiento: "2027-01-01" });
      expect(invalido.status).toBe(400);
      expect(invalido.body.message).toMatch(/correo/);
    });

    it("el token se renueva en cada petición y el viejo sigue siendo válido hasta expirar", async () => {
      const res = await api.get("/user/current");
      expect(res.status).toBe(200);
      expect(res.headers.t).toEqual(expect.any(String));
      expect(res.headers.t).not.toBe(tokenAdmin());
    });

    it("tras el logout el token de esa sesión deja de valer (fase 3: revocación por Sesion.fechaFin)", async () => {
      const login = await supertest(app).post("/auth/login").send({ c: SEMILLA.adminCorreo, p: SEMILLA.adminPassword });
      expect(login.status).toBe(200);
      const token = login.body.t;
      expect((await supertest(app).get("/user/current").set("auth", token)).status).toBe(200);
      expect((await supertest(app).post("/auth/logout").set("auth", token)).status).toBe(200);
      const despues = await supertest(app).get("/user/current").set("auth", token);
      expect(despues.status).toBe(401);
      expect(despues.body.message).toMatch(/Sesión terminada/);
      // las demás sesiones siguen vigentes
      expect((await api.get("/user/current")).status).toBe(200);
    });

    it("el login limita intentos por IP", async () => {
      const limite = Number(process.env.LOGIN_MAX_INTENTOS ?? 20);
      let ultimo = 0;
      for (let i = 0; i <= limite; i++) {
        ultimo = (await supertest(app).post("/auth/login").set("X-Forwarded-For", "203.0.113.200").send({ c: "x@x.x", p: "mala" })).status;
      }
      expect(ultimo).toBe(429);
    });
  });

  describe("inyección SQL en filtros y orden", () => {
    it("los filtros maliciosos se tratan como texto y no rompen la consulta", async () => {
      const res = await api.post("/area/list-antd").send({
        pagination: { current: 1, pageSize: 10 },
        filters: { nombre: ["GENERAL' OR '1'='1"] },
      });
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(0);
      const normal = await api.post("/area/list-antd").send({ pagination: { current: 1, pageSize: 10 }, filters: { nombre: ["GENER"] } });
      expect(normal.body.results.map((a: any) => a.nombre)).toContain("GENERAL");
    });

    it("una llave de filtro o un sortField que no es identificador responde 400", async () => {
      const llave = await api.post("/area/list-antd").send({ pagination: { current: 1, pageSize: 10 }, filters: { "nombre) OR 1=1 --": ["x"] } });
      expect(llave.status).toBe(400);
      const orden = await api.post("/user/list-antd").send({ pagination: { current: 1, pageSize: 10 }, sortField: "id; DROP TABLE usuario", filters: {} });
      expect(orden.status).toBe(400);
      const ordenOk = await api.post("/user/list-antd").send({ pagination: { current: 1, pageSize: 10 }, sortField: "usuario.nombre", sortOrder: "descend", filters: { estatusExtendido: ["activo"] } });
      expect(ordenOk.status).toBe(200);
      expect(ordenOk.body.results.length).toBeGreaterThan(0);
    });

    it("la búsqueda de catálogo general acepta texto con comillas y arreglos vacíos", async () => {
      const grupo = await crearGrupoDetalle(api, 14);
      await crearArticulo(api, { grupoId: grupo.id, cantidad: 1, movimientoTipoId: 14 });
      const res = await api.post("/current-inventory/list-catalog-general").send({
        pagination: { current: 1, pageSize: 10 },
        textoBusqueda: "Artículo') OR 1=1 --",
        areasIds: [SEMILLA.areaId],
        bodegaIds: [SEMILLA.bodegaId],
        estados: ["disponible"],
        con_foto: false,
      });
      expect(res.status).toBe(200);
      const vacio = await api.post("/current-inventory/list-catalog-general").send({
        pagination: { current: 1, pageSize: 10 }, textoBusqueda: "", areasIds: [], bodegaIds: [], estados: ["disponible"],
      });
      expect(vacio.status).toBe(200);
      expect(vacio.body.results).toHaveLength(0);
    });

    it("la búsqueda por códigos acepta string multilínea o arreglo y parametriza el LIKE", async () => {
      const grupo = await crearGrupoDetalle(api, 14);
      const { codigo } = await crearArticulo(api, { grupoId: grupo.id, cantidad: 1, movimientoTipoId: 14 });
      const texto = await api.post("/current-inventory/list-catalog-codes").send({ pagination: { current: 1, pageSize: 10 }, codigosBusqueda: `${codigo}\nzzz' OR '1'='1` });
      expect(texto.status).toBe(200);
      expect(texto.body.results).toHaveLength(1);
      const arreglo = await api.post("/current-inventory/list-catalog-codes").send({ pagination: { current: 1, pageSize: 10 }, codigosBusqueda: [codigo] });
      expect(arreglo.status).toBe(200);
      expect(arreglo.body.results).toHaveLength(1);
    });

    it("un código de barras con comillas no rompe PUT /groups/activity", async () => {
      const grupo = await crearGrupoDetalle(api, 3);
      const res = await registrarOperacion(api, { codigo: "x' OR '1'='1", cantidad: 1, movimientoTipoId: 3, grupoId: grupo.id });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No existe ningún artículo/);
    });
  });

  describe("validación de cuerpos y asignación masiva", () => {
    it("PUT /groups/activity rechaza cantidades inválidas y objetos como id", async () => {
      const grupo = await crearGrupoDetalle(api, 3);
      const res = await api.put("/groups/activity").send({ codigo: "1234567890", cantidad: "abc", grupoId: grupo.id });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cantidad/);
      const obj = await api.put("/groups/activity").send({ codigo: "1234567890", cantidad: 1, grupoId: { id: 1 } });
      expect(obj.status).toBe(400);
    });

    it("PUT /current-inventory/edit no permite cambiar cantidad ni disponibilidad", async () => {
      const grupo = await crearGrupoDetalle(api, 14);
      const { inventarioActualId } = await crearArticulo(api, { grupoId: grupo.id, cantidad: 2, movimientoTipoId: 14 });
      const res = await api.put("/current-inventory/edit").send({ inventarioActualId, bodegaId: SEMILLA.bodegaId, cantidad: 999, cantidadAlmacen: 999, disponible: "baja", estatus: "eliminado" });
      expect(res.status).toBe(200);
      const inv = await inventarioDe(inventarioActualId);
      expect(inv.cantidad).toBe(2);
      expect(inv.cantidadAlmacen).toBe(2);
      expect(inv.disponible).toBe("disponible");
      expect(inv.estatus).toBe("activo");
    });
  });

  describe("promesas que ahora se esperan", () => {
    it("DELETE /groups/activity responde cuando ya se deshizo el movimiento", async () => {
      const grupoAlta = await crearGrupoDetalle(api, 14);
      const grupoPrestamo = await crearGrupoDetalle(api, 3);
      const { codigo, inventarioActualId } = await crearArticulo(api, { grupoId: grupoAlta.id, cantidad: 3, movimientoTipoId: 14 });
      const prestamo = await registrarOperacion(api, { codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamo.id });
      const res = await api.delete("/groups/activity").send({ movimientoId: prestamo.body.id });
      expect(res.status).toBe(200);
      // sin sondeo: al responder ya debe estar restaurado
      expect((await inventarioDe(inventarioActualId)).cantidad).toBe(3);
      expect(await movimientosDe(inventarioActualId)).toHaveLength(1);
      const inexistente = await api.delete("/groups/activity").send({ movimientoId: 99999999 });
      expect(inexistente.status).toBe(400);
    });

    it("PUT /groups/edit-purchase propaga el proyecto antes de responder", async () => {
      const grupo = await crearGrupoCompra(api, SEMILLA.proyectoAId);
      const { inventarioActualId } = await crearArticulo(api, { grupoId: grupo.id, cantidad: 1 });
      const res = await api.put("/groups/edit-purchase").send({
        grupoId: grupo.id, proyectoId: SEMILLA.proyectoBId, usuariosIds: [SEMILLA.adminId], numero: `${grupo.nombre}-E`, fechaEmision: "2026-02-01",
        total: 100, impuestos: 16, montoIngresado: 100, proveedorId: SEMILLA.proveedorId, facturaTipoId: SEMILLA.facturaTipoId,
      });
      expect(res.status).toBe(200);
      const movimientos = await AppDataSource.getRepository("Movimiento" as any)
        .createQueryBuilder("m")
        .leftJoinAndSelect("m.operacion", "o")
        .leftJoinAndSelect("o.proyecto", "p")
        .where("m.inventarioActualId = :id", { id: inventarioActualId })
        .getMany() as any[];
      expect(movimientos[0].operacion.proyecto.id).toBe(SEMILLA.proyectoBId);
    });

    it("GET /activity/get-group/:id devuelve el movimiento con sus grupos (antes {} y parámetro mal nombrado)", async () => {
      const grupo = await crearGrupoDetalle(api, 14);
      const { movimiento } = await crearArticulo(api, { grupoId: grupo.id, cantidad: 1, movimientoTipoId: 14 });
      const res = await api.get(`/activity/get-group/${movimiento.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(movimiento.id);
      expect(res.body.grupos.map((g: any) => g.id)).toContain(grupo.id);
    });

    it("los handlers de reportes no implementados responden 501 en vez de colgarse", async () => {
      const res = await api.post("/reports/by-use").send({});
      expect(res.status).toBe(501);
      const inv = await api.post("/current-inventory/list-catalog-invoices").send({});
      expect(inv.status).toBe(501);
    });

    it("un operador sin rol de áreas sigue bloqueado y los ids no numéricos responden 400", async () => {
      expect((await clienteOperador(app).get("/area/list-names")).status).toBe(401);
      expect((await api.put("/current-inventory/edit").send({ inventarioActualId: "abc", bodegaId: 1 })).status).toBe(400);
      expect((await api.put("/current-inventory/edit").send({ inventarioActualId: { id: 1 }, bodegaId: 1 })).status).toBe(400);
      expect((await api.get("/current-inventory/999999")).status).toBe(404);
    });
  });
});
