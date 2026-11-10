import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import { Express } from "express";
import { AppDataSource } from "../data-source";
import { InventarioActual } from "../entity/InventarioActual";
import { Movimiento } from "../entity/Movimiento";
import { SEMILLA } from "./seed";

let contador = 0;
/** Nombre único por ejecución (Grupo.nombre es UNIQUE). */
export const nombreUnico = (prefijo = "G") => `${prefijo}-${Date.now()}-${++contador}`;
/** Código de barras único de >= 10 caracteres (el API busca por igualdad exacta a partir de 10). */
export const codigoUnico = () => `T${Date.now().toString().slice(-8)}${(++contador).toString().padStart(3, "0")}`;

export const tokenPara = (usuarioId: number, nombre: string, sesionId: number) =>
  jwt.sign({ ui: usuarioId, u: nombre, si: sesionId }, process.env.JWTSECRET, { expiresIn: "1h" });

export const tokenAdmin = () => tokenPara(SEMILLA.adminId, "Admin Pruebas", SEMILLA.sesionAdminId);
export const tokenOperador = () => tokenPara(SEMILLA.operadorId, "Operador Pruebas", SEMILLA.sesionOperadorId);

export type Cliente = ReturnType<typeof supertest>;

/** Cliente supertest con la cabecera `auth` ya puesta. */
export const clienteCon = (app: Express, token: string) => {
  const agente = supertest.agent(app);
  agente.set("auth", token);
  return agente;
};
export const clienteAdmin = (app: Express) => clienteCon(app, tokenAdmin());
export const clienteOperador = (app: Express) => clienteCon(app, tokenOperador());

/** Grupo de compra (factura) para poder dar de alta artículos por compra. */
export const crearGrupoCompra = async (api: ReturnType<typeof clienteAdmin>, proyectoId = SEMILLA.proyectoAId) => {
  const res = await api.post("/groups/new-purchase").send({
    nombre: nombreUnico("FACT"),
    proyectoId,
    movimientoTipoId: 15,
    usuariosIds: [SEMILLA.adminId],
    numero: nombreUnico("F"),
    fechaEmision: "2026-01-15",
    total: 1160,
    impuestos: 160,
    montoIngresado: 1160,
    proveedorId: SEMILLA.proveedorId,
    facturaTipoId: SEMILLA.facturaTipoId,
  });
  if (res.status !== 200) throw new Error(`crearGrupoCompra -> ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: number; nombre: string };
};

/** Grupo con detalle (proyecto + tipo) para registrar préstamos, devoluciones, bajas... */
export const crearGrupoDetalle = async (
  api: ReturnType<typeof clienteAdmin>,
  movimientoTipoId: number,
  proyectoId = SEMILLA.proyectoAId
) => {
  const res = await api.post("/groups/new-details").send({
    nombre: nombreUnico(`G${movimientoTipoId}`),
    proyectoId,
    movimientoTipoId,
    usuariosIds: [SEMILLA.adminId],
  });
  if (res.status !== 200) throw new Error(`crearGrupoDetalle -> ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: number; nombre: string };
};

/**
 * Da de alta un artículo nuevo (producto + inventario + movimiento) dentro de un grupo.
 * tipo 15 = COMPRA (queda no-disponible con cantidad 0), tipo 14 = ALTA (queda disponible).
 */
export const crearArticulo = async (
  api: ReturnType<typeof clienteAdmin>,
  opciones: { grupoId: number; cantidad?: number; movimientoTipoId?: 15 | 14 | 1 | 2; precio?: number; codigo?: string; proyectoId?: number }
) => {
  const codigo = opciones.codigo ?? codigoUnico();
  const cantidad = opciones.cantidad ?? 1;
  const precio = opciones.precio ?? 1000;
  const res = await api.put("/groups/activity-purchase").send({
    cantidad,
    movimientoTipoId: opciones.movimientoTipoId ?? 15,
    proyectoId: opciones.proyectoId ?? SEMILLA.proyectoAId,
    usuariosIds: [SEMILLA.adminId],
    precioUnitario: precio,
    precioTotal: precio * cantidad,
    bodegaId: SEMILLA.bodegaId,
    titulo: `Artículo ${codigo}`,
    descripcion: `Artículo de prueba ${codigo}`,
    areaId: SEMILLA.areaId,
    moneda: "MXP",
    productoTipoId: SEMILLA.productoTipoId,
    productoCaracteristicas: [],
    productoPrecioOriginal: precio,
    productoCodigos: [{ barras: codigo, barrasTipo: "Prueba" }],
    grupoId: opciones.grupoId,
  });
  if (res.status !== 200) throw new Error(`crearArticulo -> ${res.status} ${JSON.stringify(res.body)}`);
  const movimiento = res.body as Movimiento;
  return { codigo, movimiento, inventarioActualId: movimiento.inventarioActual.id };
};

/** Registra una operación (préstamo, devolución, baja...) sobre un artículo existente. */
export const registrarOperacion = (
  api: ReturnType<typeof clienteAdmin>,
  datos: { codigo: string; cantidad: number; movimientoTipoId?: number; proyectoId?: number; grupoId: number; usuariosIds?: number[] }
) =>
  api.put("/groups/activity").send({
    codigo: datos.codigo,
    cantidad: datos.cantidad,
    movimientoTipoId: datos.movimientoTipoId,
    proyectoId: datos.proyectoId ?? SEMILLA.proyectoAId,
    usuariosIds: datos.usuariosIds ?? [SEMILLA.adminId],
    grupoId: datos.grupoId,
  });

/** Lee el inventario directamente de la BD con los numéricos convertidos. */
export const inventarioDe = async (inventarioActualId: number) => {
  const inv = await AppDataSource.getRepository(InventarioActual).findOneOrFail({ where: { id: inventarioActualId },  loadEagerRelations: false });
  return { ...inv, cantidad: Number(inv.cantidad), cantidadAlmacen: Number(inv.cantidadAlmacen) };
};

export const movimientosDe = async (inventarioActualId: number) =>
  AppDataSource.getRepository(Movimiento)
    .createQueryBuilder("m")
    .leftJoinAndSelect("m.operacion", "o")
    .leftJoinAndSelect("o.movimientoTipo", "t")
    .where("m.inventarioActualId = :id", { id: inventarioActualId })
    .orderBy("m.id", "ASC")
    .getMany();
