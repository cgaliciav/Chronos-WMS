/**
 * Plan 04 · bloque B: modos de visibilidad por usuario (decisión 21).
 *  - PRODUCCIÓN EXCLUSIVA: ve lo que compró alguno de sus proyectos o cuyo último movimiento es de uno de ellos.
 *  - USUARIO EXCLUSIVO: ve los productos en cuyos movimientos es responsable o quien registró.
 * Lo que no ven tampoco lo operan. El rol ADMINISTRADOR y el modo `general` no cambian.
 */
import "./env";
import { Express } from "express";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import { ModoVisibilidad } from "../entity/common/ModoVisibilidad";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Proyecto } from "../entity/Proyecto";
import { Rol } from "../entity/Rol";
import { Sesion } from "../entity/Sesion";
import { Usuario } from "../entity/Usuario";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { Cliente, clienteAdmin, clienteCon, crearArticulo, crearGrupoCompra, crearGrupoDetalle, nombreUnico, tokenPara } from "./factories";
import { SEMILLA } from "./seed";

const A = SEMILLA.proyectoAId;
const B = SEMILLA.proyectoBId;

/** Roles (permisos por acción) que necesitan los usuarios de prueba para llegar a las rutas que se comprueban. */
const ROLES = [
  "INVENTARIOACTUAL-CATALOGOGENERAL", "INVENTARIOACTUAL-CATALOGOCODIGOS", "INVENTARIOACTUAL-CATALOGOPROYECTOS", "INVENTARIOACTUAL-DETALLE",
  "INVENTARIOACTUAL-EDITAR", "GRUPOS-LISTADETALLE", "GRUPOS-LISTAMOVIMIENTOS", "GRUPOS-LISTAMOVIMIENTOSACTIVOS", "GRUPOS-MOVIMIENTONUEVO",
  "GRUPOS-MOVIMIENTONUEVOCOMPRA", "GRUPOS-QUITARMOVIMIENTO", "GRUPOS-NUEVODETALLE", "GRUPOS-NUEVOCOMPRA", "MOVIMIENTO-DETALLE",
  "MOVIMIENTO-HISTORIAL", "PRODUCTOS-EDITAR",
];

describe("plan 04 · bloque B · visibilidad por usuario", () => {
  let app: Express;
  let admin: ReturnType<typeof clienteAdmin>;
  let deProduccionB: Cliente; // modo producción, proyecto B
  let sinProducciones: Cliente; // modo producción, sin proyectos
  let exclusivo: Cliente; // modo usuario
  let general: Cliente; // mismos roles, modo general
  let adminRestringido: Cliente; // rol ADMINISTRADOR con modo usuario: ve todo
  let exclusivoId: number;
  const grupos: Record<string, number> = {};
  const grupo = async (tipo: number, proyectoId = A) => {
    const llave = `${tipo}-${proyectoId}`;
    grupos[llave] ??= (await crearGrupoDetalle(admin, tipo, proyectoId)).id;
    return grupos[llave];
  };
  const operar = async (api: Cliente, codigo: string, movimientoTipoId: number, cantidad: number, proyectoId: number, extra: Record<string, unknown> = {}) =>
    api.put("/groups/activity").send({
      codigo, cantidad, movimientoTipoId, proyectoId, usuariosIds: [SEMILLA.adminId], grupoId: await grupo(movimientoTipoId, proyectoId), ...extra,
    });
  const alta = async (cantidad = 2) => crearArticulo(admin, { grupoId: await grupo(14), cantidad, movimientoTipoId: 14 });
  /** Códigos (de entre los dados) que el usuario ve en el catálogo por códigos. */
  const visibles = async (api: Cliente, codigos: string[]) => {
    const res = await api.post("/current-inventory/list-catalog-codes").send({ pagination: { current: 1, pageSize: 100 }, codigosBusqueda: codigos });
    expect(res.status).toBe(200);
    const vistos = (res.body.results as any[]).flatMap((r) => r.producto.productoClaves.map((c: any) => c.barras));
    return codigos.filter((c) => vistos.includes(c));
  };

  const crearUsuario = async (nombre: string, modo: ModoVisibilidad, proyectos: number[], roles: Rol[]) => {
    const usuario = Object.assign(new Usuario(), {
      nombre, correo: `${nombreUnico("u").toLowerCase()}@pruebas.local`, password: "Prueba123!", vencimiento: new Date("2099-12-31"),
      estatus: EstatusEstado.ACTIVO, modoVisibilidad: modo, roles, areas: [{ id: SEMILLA.areaId }], bodegas: [{ id: SEMILLA.bodegaId }],
      proyectos: proyectos.map((id) => ({ id }) as Proyecto),
    });
    usuario.hashPassword();
    const guardado = await AppDataSource.getRepository(Usuario).save(usuario);
    const sesion = await AppDataSource.getRepository(Sesion).save(Object.assign(new Sesion(), { IP: "127.0.0.1", usuario: guardado }));
    return { id: guardado.id, cliente: clienteCon(app, tokenPara(guardado.id, nombre, sesion.id)) };
  };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    admin = clienteAdmin(app);
    const repoRol = AppDataSource.getRepository(Rol);
    for (const codigoRol of ROLES) {
      if (!(await repoRol.findOneBy({ codigoRol }))) await repoRol.save(Object.assign(new Rol(), { nombre: `Prueba ${codigoRol}`, codigoRol }));
    }
    const roles = await repoRol.find({ where: ROLES.map((codigoRol) => ({ codigoRol })) });
    const rolAdmin = await repoRol.findOneByOrFail({ codigoRol: "ADMINISTRADOR" });
    deProduccionB = (await crearUsuario("Producción B", ModoVisibilidad.PRODUCCION, [B], roles)).cliente;
    sinProducciones = (await crearUsuario("Sin producciones", ModoVisibilidad.PRODUCCION, [], roles)).cliente;
    const u = await crearUsuario("Exclusivo", ModoVisibilidad.USUARIO, [A], roles);
    exclusivo = u.cliente;
    exclusivoId = u.id;
    general = (await crearUsuario("General", ModoVisibilidad.GENERAL, [A], roles)).cliente;
    adminRestringido = (await crearUsuario("Admin restringido", ModoVisibilidad.USUARIO, [], [rolAdmin])).cliente;
  });
  afterAll(cerrarPruebas);

  describe("producción exclusiva", () => {
    it("ve lo comprado por su producción (aunque después se preste a otra) y lo que tiene prestado; no lo demás", async () => {
      const compraB = await crearArticulo(admin, { grupoId: (await crearGrupoCompra(admin, B)).id, cantidad: 2, proyectoId: B });
      const compraA = await crearArticulo(admin, { grupoId: (await crearGrupoCompra(admin, A)).id, cantidad: 2, proyectoId: A });
      const prestadoAB = await alta();
      const ajeno = await alta();
      const codigos = [compraB.codigo, compraA.codigo, prestadoAB.codigo, ajeno.codigo];
      expect((await operar(admin, prestadoAB.codigo, 3, 1, B)).status).toBe(200);

      expect(await visibles(deProduccionB, codigos)).toEqual([compraB.codigo, prestadoAB.codigo]);
      expect(await visibles(general, codigos)).toEqual(codigos);
      expect(await visibles(admin, codigos)).toEqual(codigos);
      expect(await visibles(sinProducciones, codigos)).toEqual([]);

      // El artículo comprado por B se devuelve y se presta a A: B lo sigue viendo (fue su compra).
      expect((await operar(admin, compraB.codigo, 4, 2, B)).status).toBe(200);
      expect((await operar(admin, compraB.codigo, 3, 1, A)).status).toBe(200);
      // El prestado a B se devuelve (último movimiento sigue siendo de B) y luego se presta a A: B deja de verlo.
      expect((await operar(admin, prestadoAB.codigo, 4, 1, B)).status).toBe(200);
      expect(await visibles(deProduccionB, codigos)).toEqual([compraB.codigo, prestadoAB.codigo]);
      expect((await operar(admin, prestadoAB.codigo, 3, 1, A)).status).toBe(200);
      expect(await visibles(deProduccionB, codigos)).toEqual([compraB.codigo]);
    });

    it("el detalle, el historial y los movimientos de un artículo ajeno responden 404", async () => {
      const ajeno = await alta();
      const mio = await alta();
      const prestamo = await operar(admin, mio.codigo, 3, 1, B);
      expect((await deProduccionB.get(`/current-inventory/${mio.inventarioActualId}`)).status).toBe(200);
      expect((await deProduccionB.get(`/activity/${prestamo.body.id}`)).status).toBe(200);
      expect((await deProduccionB.get(`/current-inventory/${ajeno.inventarioActualId}`)).status).toBe(404);
      expect((await deProduccionB.get(`/activity/${ajeno.movimiento.id}`)).status).toBe(404);
      expect((await deProduccionB.get(`/activity/${ajeno.movimiento.id}/chain`)).status).toBe(404);
      expect((await deProduccionB.get(`/activity/history-by-current-inventory/${ajeno.inventarioActualId}`)).status).toBe(404);
      expect((await general.get(`/current-inventory/${ajeno.inventarioActualId}`)).status).toBe(200);
    });

    it("no opera lo que no ve: escanear un artículo ajeno responde como si no existiera, y deshacer un movimiento ajeno 404", async () => {
      const ajeno = await alta();
      const escaneo = await operar(deProduccionB, ajeno.codigo, 3, 1, B);
      expect(escaneo.status).toBe(400);
      expect(escaneo.body.message).toMatch(/No existe ningún artículo/);
      const inexistente = await operar(deProduccionB, "NO-EXISTE-0001", 3, 1, B);
      expect(inexistente.body.message).toBe(escaneo.body.message.replace(ajeno.codigo, "NO-EXISTE-0001"));
      expect((await deProduccionB.delete("/groups/activity").send({ movimientoId: ajeno.movimiento.id })).status).toBe(404);
      const edicion = await deProduccionB.put("/item/edit").send({
        productoId: (ajeno.movimiento.inventarioActual as any).producto.id, areaId: SEMILLA.areaId, titulo: "Cambiado", descripcion: "Cambiado",
      });
      expect(edicion.status).toBe(404);
    });

    it("solo opera a nombre de sus producciones: devolver su artículo con B funciona; con A responde 403", async () => {
      const mio = await alta(3);
      expect((await operar(admin, mio.codigo, 3, 2, B)).status).toBe(200);
      const conOtroProyecto = await operar(deProduccionB, mio.codigo, 4, 1, A);
      expect(conOtroProyecto.status).toBe(403);
      expect((await operar(deProduccionB, mio.codigo, 4, 1, B)).status).toBe(200);
      // Comprar a nombre de una producción ajena tampoco: crearía un artículo que después no vería.
      await expect(crearArticulo(deProduccionB as any, { grupoId: (await crearGrupoCompra(admin, A)).id, proyectoId: A })).rejects.toThrow(/403/);
      const compraPropia = await crearArticulo(deProduccionB as any, { grupoId: (await crearGrupoCompra(admin, B)).id, proyectoId: B });
      expect(await visibles(deProduccionB, [compraPropia.codigo])).toEqual([compraPropia.codigo]);
    });

    it("ve siempre los productos que creó por transformación, aunque después pasen a otra producción (bloque C)", async () => {
      const original = await alta(2);
      expect((await operar(admin, original.codigo, 3, 1, B)).status).toBe(200);
      const res = await admin.put("/groups/activity-transform").send({
        codigo: original.codigo, cantidad: 1, proyectoId: B, usuariosIds: [SEMILLA.adminId], grupoId: await grupo(18, B),
        productos: [{ titulo: "Producto transformado por B", cantidad: 1 }],
      });
      expect(res.status).toBe(200);
      const nuevoId = res.body.derivados[0].inventarioActual.id;
      const [{ barras }] = await AppDataSource.query(
        "SELECT pc.barras FROM producto_clave pc INNER JOIN inventario_actual ia ON ia.productoId = pc.productoId WHERE ia.id = ?",
        [nuevoId]
      );
      expect((await operar(admin, barras, 4, 1, B)).status).toBe(200);
      expect((await operar(admin, barras, 3, 1, A)).status).toBe(200);
      expect(await visibles(deProduccionB, [barras])).toEqual([barras]);
      expect((await deProduccionB.get(`/current-inventory/${nuevoId}`)).status).toBe(200);
    });

    it("los listados de movimientos y los préstamos activos solo muestran sus artículos", async () => {
      const mio = await alta();
      const ajeno = await alta();
      const prestamoMio = await operar(admin, mio.codigo, 3, 1, B);
      const prestamoAjeno = await operar(admin, ajeno.codigo, 3, 1, A);
      const activos = async (api: Cliente, proyectoId: number) =>
        ((await api.post("/groups/active-activity-list").send({
          proyectoId, usuariosIds: [], areasIds: [SEMILLA.areaId], bodegasIds: [SEMILLA.bodegaId],
          sortField: "movimiento.id", pagination: { current: 1, pageSize: 1000 }, filters: {},
        })).body.results as any[]).map((m) => m.id);
      expect(await activos(deProduccionB, B)).toContain(prestamoMio.body.id);
      expect(await activos(deProduccionB, A)).not.toContain(prestamoAjeno.body.id);
      expect(await activos(general, A)).toContain(prestamoAjeno.body.id);

      const delListado = async (api: Cliente, grupoId: number) =>
        ((await api.post("/groups/activity-list-by-group").send({
          grupoId, sortField: "movimiento.id", pagination: { current: 1, pageSize: 1000 }, filters: {},
        })).body.results as any[]).map((m) => m.id);
      expect(await delListado(deProduccionB, await grupo(3, A))).not.toContain(prestamoAjeno.body.id);
      expect(await delListado(deProduccionB, await grupo(3, B))).toContain(prestamoMio.body.id);
      expect(await delListado(general, await grupo(3, A))).toContain(prestamoAjeno.body.id);
    });
  });

  describe("usuario exclusivo", () => {
    it("ve los artículos donde es responsable o quien registró, aunque el último movimiento sea de otro", async () => {
      const comoResponsable = await alta();
      const registrado = await alta(3);
      const ajeno = await alta();
      const codigos = [comoResponsable.codigo, registrado.codigo, ajeno.codigo];
      expect(await visibles(exclusivo, codigos)).toEqual([]);

      expect((await operar(admin, comoResponsable.codigo, 3, 1, A, { usuariosIds: [exclusivoId] })).status).toBe(200);
      expect(await visibles(exclusivo, codigos)).toEqual([comoResponsable.codigo]);

      // Para registrar un movimiento tiene que ver el artículo: el administrador lo hace responsable y él lo devuelve.
      expect((await operar(admin, registrado.codigo, 3, 2, A, { usuariosIds: [exclusivoId] })).status).toBe(200);
      const devolucion = await operar(exclusivo, registrado.codigo, 4, 1, A);
      expect(devolucion.status).toBe(200);
      // Movimientos posteriores de otras personas no le quitan la visibilidad.
      expect((await operar(admin, comoResponsable.codigo, 4, 1, A)).status).toBe(200);
      expect((await operar(admin, registrado.codigo, 4, 1, A)).status).toBe(200);
      expect(await visibles(exclusivo, codigos)).toEqual([comoResponsable.codigo, registrado.codigo]);
      expect((await exclusivo.get(`/current-inventory/${ajeno.inventarioActualId}`)).status).toBe(404);
    });

    it("ve los artículos que él mismo da de alta (quien registró) y no restringe el proyecto", async () => {
      const propio = await crearArticulo(exclusivo as any, { grupoId: await grupo(14), cantidad: 1, movimientoTipoId: 14 });
      expect(await visibles(exclusivo, [propio.codigo])).toEqual([propio.codigo]);
      expect(await visibles(deProduccionB, [propio.codigo])).toEqual([]);
    });
  });

  it("el rol ADMINISTRADOR ignora el modo de visibilidad", async () => {
    const articulo = await alta();
    expect(await visibles(adminRestringido, [articulo.codigo])).toEqual([articulo.codigo]);
    expect((await adminRestringido.get(`/current-inventory/${articulo.inventarioActualId}`)).status).toBe(200);
  });

  it("el modo se guarda al crear y editar usuarios, y GET /user/current lo devuelve", async () => {
    const correo = `${nombreUnico("modo").toLowerCase()}@pruebas.local`;
    const datos = { nombre: "Usuario con modo", correo, vencimiento: "2099-12-31", rolesIds: [], proyectosIds: [B], bodegasIds: [], areasIds: [] };
    expect((await admin.post("/user/new").send({ ...datos, modoVisibilidad: "produccion" })).status).toBe(200);
    const leer = async () => (await AppDataSource.query("SELECT id, modoVisibilidad FROM usuario WHERE correo = ?", [correo]))[0];
    expect((await leer()).modoVisibilidad).toBe("produccion");
    const { id } = await leer();
    expect((await admin.put("/user/edit").send({ ...datos, id })).status).toBe(200); // sin modo: se conserva
    expect((await leer()).modoVisibilidad).toBe("produccion");
    expect((await admin.put("/user/edit").send({ ...datos, id, modoVisibilidad: "usuario" })).status).toBe(200);
    expect((await leer()).modoVisibilidad).toBe("usuario");
    expect((await admin.post("/user/new").send({ ...datos, correo: `x${correo}`, modoVisibilidad: "otro" })).status).toBe(400);
    expect((await exclusivo.get("/user/current")).body.modoVisibilidad).toBe("usuario");
    expect((await admin.get("/user/current")).body.modoVisibilidad).toBe("general");
  });
});
