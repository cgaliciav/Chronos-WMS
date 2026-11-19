/**
 * Perfiles de usuario (decisión 22) y usuarios sin correo (decisión 23).
 *  - Los permisos salen del perfil: Superadministrador (todo), Administrador (todo menos la Configuración),
 *    Encargado de Producción (búsqueda por proyecto, compras completas y listados por proyecto, sin altas de
 *    préstamos, devoluciones ni bajas) y Visita (solo préstamos activos).
 *  - `personalizado` conserva los roles sueltos de antes.
 *  - `sin-acceso`: correo inventado, no entra, no recibe correos.
 */
import "./env";
import { Express } from "express";
import supertest from "supertest";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Perfil } from "../entity/common/Perfil";
import { Rol } from "../entity/Rol";
import { Sesion } from "../entity/Sesion";
import { Usuario } from "../entity/Usuario";
import EnviarMail from "../helpers/enviarMail";
import CorreoService from "../services/CorreoService";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { Cliente, clienteAdmin, clienteCon, nombreUnico, tokenPara } from "./factories";
import { SEMILLA } from "./seed";

const TABLA = { pagination: { current: 1, pageSize: 10 }, sortField: "movimiento.id", sortOrder: "descend", filters: {} };
const DATOS = { vencimiento: "2099-12-31", proyectosIds: [SEMILLA.proyectoAId], bodegasIds: [SEMILLA.bodegaId], areasIds: [SEMILLA.areaId] };

describe("perfiles de usuario y usuarios sin correo", () => {
  let app: Express;
  let superadmin: ReturnType<typeof clienteAdmin>;
  const enviados: string[] = [];

  const crearUsuario = async (perfil: Perfil, roles: Rol[] = []) => {
    const nombre = nombreUnico(perfil);
    const usuario = Object.assign(new Usuario(), {
      nombre, correo: `${nombreUnico("u").toLowerCase()}@pruebas.local`, password: "Prueba123!", vencimiento: new Date("2099-12-31"),
      estatus: EstatusEstado.ACTIVO, perfil, roles, areas: [{ id: SEMILLA.areaId }], bodegas: [{ id: SEMILLA.bodegaId }], proyectos: [{ id: SEMILLA.proyectoAId }],
    });
    usuario.hashPassword();
    const guardado = await AppDataSource.getRepository(Usuario).save(usuario);
    const sesion = await AppDataSource.getRepository(Sesion).save(Object.assign(new Sesion(), { IP: "127.0.0.1", usuario: guardado }));
    return { id: guardado.id, correo: guardado.correo, cliente: clienteCon(app, tokenPara(guardado.id, nombre, sesion.id)) as Cliente };
  };
  const estado = async (peticion: PromiseLike<{ status: number }>) => (await peticion).status;
  const activos = (api: Cliente) => api.post("/groups/active-activity-list").send({ ...TABLA, proyectoId: SEMILLA.proyectoAId, movimientoTipoId: [3], usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId] });
  const nuevoListado = (api: Cliente) => api.post("/groups/new-details").send({});
  const nuevaCompra = (api: Cliente) => api.post("/groups/new-purchase").send({});
  const porProyecto = (api: Cliente) => api.post("/groups/list-by-project-antd").send({ ...TABLA, proyectoId: SEMILLA.proyectoAId, movimientoTipoId: [3], usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId] });

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    superadmin = clienteAdmin(app);
    jest.spyOn(EnviarMail, "correoNuevoUsuario").mockImplementation((correo: string) => void enviados.push(correo));
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await cerrarPruebas();
  });

  it("el Superadministrador entra a la Configuración; el Administrador hace todo lo demás, pero no eso", async () => {
    const administrador = (await crearUsuario(Perfil.ADMINISTRADOR)).cliente;
    expect(await estado(superadmin.get("/config"))).toBe(200);
    expect(await estado(administrador.get("/config"))).toBe(401);
    expect(await estado(administrador.put("/config/marca").send({}))).toBe(401);
    expect(await estado(administrador.post("/user/list-antd").send({ ...TABLA, sortField: "usuario.id" }))).toBe(200);
    expect(await estado(activos(administrador))).toBe(200);

    const actual = await administrador.get("/user/current");
    expect(actual.body.perfil).toBe("administrador");
    expect(actual.body.roles).toEqual(["ADMINISTRADOR"]);
    expect((await superadmin.get("/user/current")).body.roles).toEqual(["ADMINISTRADOR", "CONFIGURACION-EDITAR"]);
  });

  it("Visita solo ve los préstamos activos", async () => {
    const visita = (await crearUsuario(Perfil.VISITA)).cliente;
    expect(await estado(activos(visita))).toBe(200);
    expect(await estado(porProyecto(visita))).toBe(401);
    expect(await estado(nuevoListado(visita))).toBe(401);
    expect(await estado(nuevaCompra(visita))).toBe(401);
    expect(await estado(visita.post("/reports/by-project").send({}))).toBe(401);
    expect(await estado(visita.post("/current-inventory/list-catalog-general").send({}))).toBe(401);
    expect(await estado(visita.get("/config"))).toBe(401);
  });

  it("Encargado de Producción: búsqueda por proyecto, compras y listados; sin altas de préstamos, devoluciones ni bajas", async () => {
    const encargado = (await crearUsuario(Perfil.ENCARGADO_PRODUCCION)).cliente;
    expect(await estado(activos(encargado))).toBe(200);
    expect(await estado(porProyecto(encargado))).toBe(200);
    // llega al controlador (400 por cuerpo incompleto), no se queda en el permiso (401)
    expect(await estado(nuevaCompra(encargado))).toBe(400);
    expect(await estado(encargado.put("/groups/activity-purchase").send({}))).toBe(400);
    expect(await estado(encargado.post("/current-inventory/list-catalog-project").send({}))).not.toBe(401);
    // las altas de préstamo, devolución y baja comparten estas dos rutas
    expect(await estado(nuevoListado(encargado))).toBe(401);
    expect(await estado(encargado.put("/groups/activity").send({}))).toBe(401);
    expect(await estado(encargado.post("/current-inventory/list-catalog-general").send({}))).toBe(401);
    expect(await estado(encargado.post("/user/list-antd").send(TABLA))).toBe(401);
    expect(await estado(encargado.get("/config"))).toBe(401);
  });

  it("con un perfil los roles sueltos de la base no cuentan; `personalizado` los conserva", async () => {
    const repoRol = AppDataSource.getRepository(Rol);
    const rolAdmin = await repoRol.findOneByOrFail({ codigoRol: "ADMINISTRADOR" });
    const rolListado = await repoRol.findOneByOrFail({ codigoRol: "GRUPOS-LISTADETALLE" });
    const visitaConRolAdmin = (await crearUsuario(Perfil.VISITA, [rolAdmin])).cliente;
    expect(await estado(porProyecto(visitaConRolAdmin))).toBe(401);

    const personalizado = await crearUsuario(Perfil.PERSONALIZADO, [rolListado]);
    expect(await estado(porProyecto(personalizado.cliente))).toBe(200);
    expect(await estado(activos(personalizado.cliente))).toBe(401);
    // editar sin `perfil` conserva el perfil y los roles sueltos
    const editar = (extra: object) => superadmin.put("/user/edit").send({ ...DATOS, id: personalizado.id, nombre: "Personalizado editado", correo: personalizado.correo, ...extra });
    expect(await estado(editar({}))).toBe(200);
    expect(await estado(porProyecto(personalizado.cliente))).toBe(200);
    // al darle un perfil pierde los roles sueltos
    expect(await estado(editar({ perfil: "visita" }))).toBe(200);
    expect(await estado(porProyecto(personalizado.cliente))).toBe(401);
    expect(await estado(activos(personalizado.cliente))).toBe(200);
    const guardado = await AppDataSource.getRepository(Usuario).findOneOrFail({ where: { id: personalizado.id }, relations: { roles: true } });
    expect(guardado.roles).toEqual([]);
  });

  it("solo un Superadministrador asigna o edita a un Superadministrador, y nadie cambia su propio perfil", async () => {
    const administrador = await crearUsuario(Perfil.ADMINISTRADOR);
    const alta = (api: Cliente, perfil: string) => api.post("/user/new").send({ ...DATOS, nombre: nombreUnico("Alta"), correo: `${nombreUnico("a").toLowerCase()}@pruebas.local`, perfil });
    expect(await estado(alta(administrador.cliente, "superadministrador"))).toBe(403);
    expect(await estado(alta(administrador.cliente, "administrador"))).toBe(200);
    expect(await estado(alta(superadmin, "superadministrador"))).toBe(200);
    expect(await estado(alta(superadmin, "personalizado"))).toBe(400);
    expect(await estado(alta(superadmin, "otro"))).toBe(400);

    const yo = { ...DATOS, id: administrador.id, nombre: "Administrador", correo: administrador.correo };
    expect(await estado(administrador.cliente.put("/user/edit").send({ ...yo, perfil: "superadministrador" }))).toBe(403);
    expect(await estado(administrador.cliente.put("/user/edit").send({ ...yo, perfil: "visita" }))).toBe(400);
    expect(await estado(administrador.cliente.put("/user/edit").send({ ...yo, perfil: "administrador" }))).toBe(200);
    const admin = await AppDataSource.getRepository(Usuario).findOneByOrFail({ id: SEMILLA.adminId });
    expect(await estado(administrador.cliente.put("/user/edit").send({ ...DATOS, id: admin.id, nombre: admin.nombre, correo: admin.correo, perfil: "visita" }))).toBe(403);
  });

  it("usuario sin correo: correo inventado, sin envío, sin acceso, y sigue disponible como responsable", async () => {
    const nombre = `José Ñandú ${nombreUnico("SC")}`;
    enviados.length = 0;
    const alta = await superadmin.post("/user/new").send({ ...DATOS, nombre, perfil: "sin-acceso" });
    expect(alta.status).toBe(200);
    expect(alta.body.correo).toMatch(/^jose\.nandu\.sc\.[0-9.]+@fake\.exogrid\.io$/);
    expect(enviados).toEqual([]);
    // mismo nombre: el correo inventado no se repite
    const repetido = await superadmin.post("/user/new").send({ ...DATOS, nombre, perfil: "sin-acceso" });
    expect(repetido.body.correo).toBe(alta.body.correo.replace("@", ".2@"));

    const usuario = await AppDataSource.getRepository(Usuario).findOneByOrFail({ correo: alta.body.correo });
    // ni conociendo la contraseña entra
    usuario.password = "Prueba123!";
    usuario.hashPassword();
    await AppDataSource.getRepository(Usuario).update(usuario.id, { password: usuario.password });
    expect(await estado(supertest(app).post("/auth/login").send({ c: alta.body.correo, p: "Prueba123!" }))).toBe(401);
    expect(await estado(superadmin.put("/user/renewpassword").send({ email: alta.body.correo }))).toBe(400);

    const lista = await superadmin.post("/user/list-names-dynamic").send({ busqueda: nombre });
    expect(lista.status).toBe(200);
    expect(lista.body.map((u: { id: number }) => u.id)).toContain(usuario.id);

    // un usuario con acceso necesita correo real
    const sinCorreo = { ...DATOS, nombre: nombreUnico("Sin correo"), perfil: "visita" };
    expect(await estado(superadmin.post("/user/new").send(sinCorreo))).toBe(400);
    expect(await estado(superadmin.post("/user/new").send({ ...sinCorreo, correo: "alguien@fake.exogrid.io" }))).toBe(400);
    // al editarlo conserva su correo inventado; al darle acceso exige uno real
    const editar = (extra: object) => superadmin.put("/user/edit").send({ ...DATOS, id: usuario.id, nombre, ...extra });
    expect(await estado(editar({ perfil: "sin-acceso" }))).toBe(200);
    expect((await AppDataSource.getRepository(Usuario).findOneByOrFail({ id: usuario.id })).correo).toBe(alta.body.correo);
    expect(await estado(editar({ perfil: "visita" }))).toBe(400);
    expect(await estado(editar({ perfil: "visita", correo: `${nombreUnico("real").toLowerCase()}@pruebas.local` }))).toBe(200);
  });

  it("el servicio de correo nunca envía a una dirección inventada", async () => {
    const mensajes: unknown[] = [];
    const fabrica = CorreoService.fabrica;
    CorreoService.fabrica = () => ({ sendMail: async (m) => (mensajes.push(m), {}), verify: async () => true });
    CorreoService.olvidarTransporte();
    try {
      await CorreoService.enviar("nuevoPassword", "alguien@fake.exogrid.io", { password: "x" });
      expect(mensajes).toEqual([]);
      await CorreoService.enviar("nuevoPassword", "alguien@pruebas.local", { password: "x" });
      expect(mensajes).toHaveLength(1);
    } finally {
      CorreoService.fabrica = fabrica;
      CorreoService.olvidarTransporte();
    }
  });
});
