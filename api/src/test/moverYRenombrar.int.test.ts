/**
 * Decisiones 24-26:
 *  - `PUT /groups/rename`: cambiar el nombre de un listado, solo administradores.
 *  - `PUT /groups/activity-move`: mover un movimiento a otro listado del mismo tipo, uno por uno; la operación toma
 *    el proyecto y los responsables del listado destino. Solo administradores.
 *  - `POST /groups/list-by-supplier-antd`: artículos comprados a un proveedor, con proyecto opcional.
 */
import "./env";
import { Express } from "express";
import { AppDataSource } from "../data-source";
import { crearApp } from "../app";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Perfil } from "../entity/common/Perfil";
import { Proveedor } from "../entity/Proveedor";
import { Sesion } from "../entity/Sesion";
import { Usuario } from "../entity/Usuario";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { Cliente, clienteAdmin, clienteCon, crearArticulo, crearGrupoCompra, crearGrupoDetalle, inventarioDe, nombreUnico, registrarOperacion, tokenPara } from "./factories";
import { SEMILLA } from "./seed";

const A = SEMILLA.proyectoAId;
const B = SEMILLA.proyectoBId;
const TABLA = { pagination: { current: 1, pageSize: 200 }, sortField: "movimiento.id", sortOrder: "descend", filters: {} };

describe("listados: renombrar, mover movimientos y productos por proveedor", () => {
  let app: Express;
  let admin: ReturnType<typeof clienteAdmin>;
  let encargado: Cliente;

  const operacionDe = async (movimientoId: number) =>
    (
      await AppDataSource.query(
        "SELECT o.proyectoId, GROUP_CONCAT(ou.usuarioId ORDER BY ou.usuarioId) AS usuarios FROM movimiento m INNER JOIN operacion o ON o.id = m.operacionId LEFT JOIN operacion_usuarios_usuario ou ON ou.operacionId = o.id WHERE m.id = ? GROUP BY o.id",
        [movimientoId]
      )
    )[0];
  const listadosDe = async (movimientoId: number) =>
    (await AppDataSource.query("SELECT grupoId FROM grupo_movimientos_movimiento WHERE movimientoId = ? ORDER BY grupoId", [movimientoId])).map((f: any) => Number(f.grupoId));
  const mover = (api: Cliente, movimientoId: number, grupoOrigenId: number, grupoDestinoId: number) =>
    api.put("/groups/activity-move").send({ movimientoId, grupoOrigenId, grupoDestinoId });
  /** Artículo dado de alta (disponible) y prestado en un listado nuevo del proyecto. */
  const prestamo = async (proyectoId = A, cantidad = 1) => {
    const altas = await crearGrupoDetalle(admin, 14);
    const articulo = await crearArticulo(admin, { grupoId: altas.id, cantidad: 3, movimientoTipoId: 14 });
    const listado = await crearGrupoDetalle(admin, 3, proyectoId);
    const res = await registrarOperacion(admin, { codigo: articulo.codigo, cantidad, movimientoTipoId: 3, proyectoId, grupoId: listado.id });
    expect(res.status).toBe(200);
    return { ...articulo, listado, movimientoId: res.body.id as number };
  };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    admin = clienteAdmin(app);
    const usuario = Object.assign(new Usuario(), {
      nombre: nombreUnico("Encargado"), correo: `${nombreUnico("u").toLowerCase()}@pruebas.local`, password: "Prueba123!", vencimiento: new Date("2099-12-31"),
      estatus: EstatusEstado.ACTIVO, perfil: Perfil.ENCARGADO_PRODUCCION, areas: [{ id: SEMILLA.areaId }], bodegas: [{ id: SEMILLA.bodegaId }], proyectos: [{ id: A }],
    });
    usuario.hashPassword();
    const guardado = await AppDataSource.getRepository(Usuario).save(usuario);
    const sesion = await AppDataSource.getRepository(Sesion).save(Object.assign(new Sesion(), { IP: "127.0.0.1", usuario: guardado }));
    encargado = clienteCon(app, tokenPara(guardado.id, usuario.nombre, sesion.id));
  });
  afterAll(async () => {
    await cerrarPruebas();
  });

  describe("PUT /groups/rename", () => {
    it("un administrador cambia el nombre; quien no lo es recibe 401", async () => {
      const listado = await crearGrupoDetalle(admin, 3);
      const nombre = nombreUnico("RENOMBRADO");
      expect((await encargado.put("/groups/rename").send({ grupoId: listado.id, nombre })).status).toBe(401);
      const res = await admin.put("/groups/rename").send({ grupoId: listado.id, nombre: `  ${nombre}  ` });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: listado.id, nombre });
      expect((await admin.get(`/groups/${listado.id}`)).body.nombre).toBe(nombre);
    });

    it("409 si otro listado ya tiene ese nombre; 400 con un nombre corto; 404 si no existe", async () => {
      const uno = await crearGrupoDetalle(admin, 3);
      const otro = await crearGrupoDetalle(admin, 4);
      const repetido = await admin.put("/groups/rename").send({ grupoId: uno.id, nombre: otro.nombre });
      expect(repetido.status).toBe(409);
      expect(repetido.body.message).toMatch(/YA EXISTE UN LISTADO/);
      // conservar su propio nombre no es un duplicado
      expect((await admin.put("/groups/rename").send({ grupoId: uno.id, nombre: uno.nombre })).status).toBe(200);
      expect((await admin.put("/groups/rename").send({ grupoId: uno.id, nombre: "ab" })).status).toBe(400);
      expect((await admin.put("/groups/rename").send({ grupoId: 99999999, nombre: nombreUnico("X") })).status).toBe(404);
    });

    it("en una compra también cambia el número de la factura", async () => {
      const compra = await crearGrupoCompra(admin);
      const nombre = nombreUnico("FAC-NUEVA");
      expect((await admin.put("/groups/rename").send({ grupoId: compra.id, nombre })).status).toBe(200);
      const [fila] = await AppDataSource.query(
        "SELECT g.nombre, f.numero FROM grupo g INNER JOIN grupo_detalle gd ON gd.id = g.grupoDetalleId INNER JOIN factura_detalle f ON f.id = gd.facturaDetalleId WHERE g.id = ?",
        [compra.id]
      );
      expect(fila).toEqual({ nombre, numero: nombre });
      expect((await admin.put("/groups/rename").send({ grupoId: compra.id, nombre: "F".repeat(41) })).status).toBe(400);
    });
  });

  describe("PUT /groups/activity-move", () => {
    it("mueve un préstamo a otro listado de préstamos de otro proyecto y responsable, sin tocar existencias", async () => {
      const p = await prestamo(A);
      const destino = (
        await admin.post("/groups/new-details").send({ nombre: nombreUnico("G3-DESTINO"), proyectoId: B, movimientoTipoId: 3, usuariosIds: [SEMILLA.operadorId] })
      ).body;
      const antes = await inventarioDe(p.inventarioActualId);
      expect(await operacionDe(p.movimientoId)).toEqual({ proyectoId: A, usuarios: `${SEMILLA.adminId}` });

      expect((await mover(encargado, p.movimientoId, p.listado.id, destino.id)).status).toBe(401);
      const res = await mover(admin, p.movimientoId, p.listado.id, destino.id);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ movimientoId: p.movimientoId, grupoDestinoId: destino.id, proyectoCambiado: true });

      expect(await listadosDe(p.movimientoId)).toEqual([destino.id]);
      expect(await operacionDe(p.movimientoId)).toEqual({ proyectoId: B, usuarios: `${SEMILLA.operadorId}` });
      const despues = await inventarioDe(p.inventarioActualId);
      expect([despues.cantidad, despues.cantidadAlmacen]).toEqual([antes.cantidad, antes.cantidadAlmacen]);
      // el préstamo queda pendiente a nombre del proyecto destino: se devuelve contra él
      const devoluciones = await crearGrupoDetalle(admin, 4, B);
      expect((await registrarOperacion(admin, { codigo: p.codigo, cantidad: 1, movimientoTipoId: 4, proyectoId: B, grupoId: devoluciones.id })).status).toBe(200);
    });

    it("solo entre listados del mismo tipo, con destino existente y activo", async () => {
      const p = await prestamo(A);
      const devoluciones = await crearGrupoDetalle(admin, 4);
      const otroTipo = await mover(admin, p.movimientoId, p.listado.id, devoluciones.id);
      expect(otroTipo.status).toBe(400);
      expect(otroTipo.body.message).toMatch(/mismo tipo/);
      expect((await mover(admin, p.movimientoId, p.listado.id, 99999999)).status).toBe(404);
      expect((await mover(admin, p.movimientoId, p.listado.id, p.listado.id)).status).toBe(400);
      // el movimiento no está en el listado indicado como origen
      const ajeno = await crearGrupoDetalle(admin, 3);
      const destino = await crearGrupoDetalle(admin, 3);
      expect((await mover(admin, p.movimientoId, ajeno.id, destino.id)).status).toBe(400);
      // destino deshabilitado
      expect((await admin.put(`/groups/disable/${destino.id}`)).status).toBe(200);
      expect((await mover(admin, p.movimientoId, p.listado.id, destino.id)).status).toBe(400);
      expect(await listadosDe(p.movimientoId)).toEqual([p.listado.id]);
    });

    it("con devoluciones relacionadas se mueve dentro del mismo proyecto, pero no a otro proyecto (409)", async () => {
      const p = await prestamo(A, 2);
      const devoluciones = await crearGrupoDetalle(admin, 4, A);
      expect((await registrarOperacion(admin, { codigo: p.codigo, cantidad: 1, movimientoTipoId: 4, proyectoId: A, grupoId: devoluciones.id })).status).toBe(200);
      const otroProyecto = await crearGrupoDetalle(admin, 3, B);
      const rechazo = await mover(admin, p.movimientoId, p.listado.id, otroProyecto.id);
      expect(rechazo.status).toBe(409);
      expect(rechazo.body.movimientos).toEqual([p.movimientoId]);
      expect(await operacionDe(p.movimientoId)).toMatchObject({ proyectoId: A });
      const mismoProyecto = await crearGrupoDetalle(admin, 3, A);
      const res = await mover(admin, p.movimientoId, p.listado.id, mismoProyecto.id);
      expect(res.status).toBe(200);
      expect(res.body.proyectoCambiado).toBe(false);
      expect(await listadosDe(p.movimientoId)).toEqual([mismoProyecto.id]);
    });

    it("mueve una compra a otra factura", async () => {
      const origen = await crearGrupoCompra(admin, A);
      const destino = await crearGrupoCompra(admin, B);
      const articulo = await crearArticulo(admin, { grupoId: origen.id, proyectoId: A });
      expect((await mover(admin, articulo.movimiento.id, origen.id, destino.id)).status).toBe(200);
      expect(await listadosDe(articulo.movimiento.id)).toEqual([destino.id]);
      expect(await operacionDe(articulo.movimiento.id)).toMatchObject({ proyectoId: B });
    });
  });

  describe("POST /groups/list-by-supplier-antd", () => {
    it("lista los artículos comprados a un proveedor; el proyecto es opcional", async () => {
      const proveedor = await AppDataSource.getRepository(Proveedor).save(Object.assign(new Proveedor(), { nombre: nombreUnico("PROVEEDOR"), RFCEmite: "XAXX010101000" }));
      const factura = async (proyectoId: number, proveedorId: number) => {
        const res = await admin.post("/groups/new-purchase").send({
          nombre: nombreUnico("FACT"), proyectoId, movimientoTipoId: 15, usuariosIds: [SEMILLA.adminId], numero: nombreUnico("F"), fechaEmision: "2026-01-15",
          total: 1160, impuestos: 160, montoIngresado: 1160, proveedorId, facturaTipoId: SEMILLA.facturaTipoId,
        });
        expect(res.status).toBe(200);
        return res.body.id as number;
      };
      const enA = await crearArticulo(admin, { grupoId: await factura(A, proveedor.id), proyectoId: A });
      const enB = await crearArticulo(admin, { grupoId: await factura(B, proveedor.id), proyectoId: B });
      const deOtro = await crearArticulo(admin, { grupoId: await factura(A, SEMILLA.proveedorId), proyectoId: A });

      const codigos = async (cuerpo: object, api: Cliente = admin) => {
        const res = await api.post("/groups/list-by-supplier-antd").send({ ...TABLA, ...cuerpo });
        expect(res.status).toBe(200);
        return (res.body.results as any[]).flatMap((m) => m.inventarioActual.producto.productoClaves.map((c: any) => c.barras)).sort();
      };
      expect(await codigos({ proveedorId: proveedor.id })).toEqual([enA.codigo, enB.codigo].sort());
      expect(await codigos({ proveedorId: proveedor.id, proyectoId: B })).toEqual([enB.codigo]);
      expect(await codigos({ proveedorId: proveedor.id, proyectoId: 0 })).toEqual([enA.codigo, enB.codigo].sort());
      expect(await codigos({ proveedorId: SEMILLA.proveedorId })).toContain(deOtro.codigo);

      const res = await admin.post("/groups/list-by-supplier-antd").send({ ...TABLA, proveedorId: proveedor.id, proyectoId: B });
      expect(res.body.results[0].grupos[0].grupoDetalle.facturaDetalle.proveedor.id).toBe(proveedor.id);
      expect(res.body.pagination.total).toBe(1);
      expect((await admin.post("/groups/list-by-supplier-antd").send(TABLA)).status).toBe(400);
      expect((await encargado.post("/groups/list-by-supplier-antd").send({ ...TABLA, proveedorId: proveedor.id })).status).toBe(401);
    });
  });
});
