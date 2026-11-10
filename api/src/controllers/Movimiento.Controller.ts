import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { InventarioActual } from "../entity/InventarioActual";
import { Movimiento } from "../entity/Movimiento";
import { Sesion } from "../entity/Sesion";
import { AppError } from "../helpers/errorClases";
import CommonController from "./common/Common.Controller";
import OperacionController from "./Operacion.Controller";
import MovimientoService from "../services/MovimientoService";
import { parametro } from "../helpers/ids";

// Registrar, deshacer y relacionar operaciones vive en services/MovimientoService.ts (plan 02 fase 3).
// Tipos de movimiento: entity/common/MovimientoTipoId.ts y docs/api/tipos-de-movimiento.md.

const crearBaseMovimiento = async (
  cantidad: number,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  const movimiento = new Movimiento();
  movimiento.cantidad = cantidad;
  movimiento.inventarioActual = inventarioActual;
  movimiento.sesionId = sesionId;
  movimiento.sesion = await AppDataSource.getRepository(Sesion).findOneByOrFail({ id: sesionId });
  return movimiento;
};

const funcionQueryId = (id: number | string) => {
  return AppDataSource.getRepository(Movimiento)
    .createQueryBuilder("movimiento")
    .leftJoinAndSelect("movimiento.inventarioActual", "inventarioActual")
    .leftJoinAndSelect("movimiento.operacion", "operacion")
    .leftJoinAndSelect("movimiento.grupos", "grupos")
    .leftJoinAndSelect("movimiento.sesion", "sesion")

    .leftJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoinAndSelect("inventarioActual.bodega", "bodega")
    .leftJoinAndSelect("producto.area", "area")
    .leftJoinAndSelect("producto.productoPrecios", "productoPrecios")
    .leftJoinAndSelect("producto.productoClaves", "productoClaves")
    .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
    .leftJoinAndSelect("producto.archivos", "productoArchivos")
    .addSelect(["productoArchivos.id"])

    .leftJoinAndSelect("operacion.operacionDetalle", "operacionDetalle")
    .leftJoinAndSelect("operacion.proyecto", "proyecto")
    .leftJoinAndSelect("operacion.operacionPrecios", "operacionPrecios")
    .leftJoinAndSelect("operacion.comentarios", "operacionComentarios")
    .leftJoinAndSelect("operacion.usuarios", "operacionUsuarios")
    .leftJoinAndSelect("operacion.movimientoTipo", "movimientoTipo")
    .leftJoin("operacion.archivos", "operacionArchivos")
    .addSelect(["operacionArchivos.id"])

    .leftJoinAndSelect("grupos.comentarios", "gruposComentarios")
    .leftJoin("grupos.archivos", "gruposArchivos")
    .addSelect(["gruposArchivos.id"])
    .leftJoinAndSelect(
      "operacionComentarios.sesion",
      "operacionComentariosSesion"
    )
    .leftJoinAndSelect("gruposComentarios.sesion", "gruposComentariosSesion")
    .leftJoinAndSelect("operacionPrecios.precioTipo", "operacionPrecioTipo")

    .leftJoinAndSelect("sesion.usuario", "usuario")
    .leftJoinAndSelect(
      "operacionComentariosSesion.usuario",
      "operacionComentariosSesionUsuario"
    )
    .leftJoinAndSelect(
      "gruposComentariosSesion.usuario",
      "gruposComentariosSesionUsuario"
    )

    // Relaciones con otros movimientos (plan 02 fase 3)
    .leftJoinAndSelect("movimiento.relacionesComoDerivado", "relacionesComoDerivado")
    .leftJoinAndSelect("relacionesComoDerivado.origen", "relacionOrigen")
    .leftJoinAndSelect("movimiento.relacionesComoOrigen", "relacionesComoOrigen")
    .leftJoinAndSelect("relacionesComoOrigen.derivado", "relacionDerivado")

    .where("movimiento.id=:id", { id });
};
class MovimientoController {
  // guardar - creacion de movimiento sin operacion (línea de un listado)
  static guardar = async (
    cantidad: number,
    inventarioActual: InventarioActual,
    sesionId: number
  ) => {
    return await AppDataSource.getRepository(Movimiento).save(
      await crearBaseMovimiento(cantidad, inventarioActual, sesionId)
    );
  };

  static editarOperacion = async (
    movimiento: Movimiento,
    tipoMovimientoId: number | string,
    proyectoId: number | string,
    usuariosIds: (number | string)[],
    sesionId: number
  ) => {
    return await OperacionController.modificar(
      movimiento.operacion,
      tipoMovimientoId,
      proyectoId,
      usuariosIds,
      sesionId
    );
  };

  /** GET /activity/:id/chain — movimiento, sus orígenes, sus derivados y su saldo pendiente. */
  static obtenerCadena = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await MovimientoService.cadena(parametro(req, "id")));
    } catch (error) {
      next(error);
    }
  };

  /** GET /activity/open-by-inventory/:inventarioActualId?proyectoId= — salidas con saldo pendiente. */
  static obtenerAbiertosPorInventario = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await MovimientoService.abiertosPorInventario(parametro(req, "inventarioActualId"), req.query.proyectoId as string | undefined));
    } catch (error) {
      next(error);
    }
  };

  static obtenerUltimoMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id"); //inventarioActualId
    try {
      res.json(
        await AppDataSource.getRepository(Movimiento)
          .createQueryBuilder("movimiento")
          .leftJoin("movimiento.inventarioActual", "inventarioActual")
          .leftJoinAndSelect("movimiento.operacion", "operacion")
          .leftJoinAndSelect("operacion.operacionDetalle", "operacionDetalle")
          .leftJoin("operacion.proyecto", "proyecto")
          .leftJoin("operacion.movimientoTipo", "movimientoTipo")
          .addSelect("movimientoTipo.nombre")
          .addSelect("proyecto.nombre")
          .where("inventarioActual.id=:id", { id })
          .orderBy("movimiento.id", "DESC")
          .getOne()
      );
    } catch (error) {
      next(error);
    }
  };

  static obtenerHistorialMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id"); //inventarioActualId
    try {
      res.json(
        await AppDataSource.getRepository(Movimiento)
          .createQueryBuilder("movimiento")
          .leftJoinAndSelect("movimiento.inventarioActual", "inventarioActual")
          .leftJoinAndSelect("movimiento.operacion", "operacion")
          .leftJoinAndSelect("movimiento.sesion", "sesion")
          .leftJoinAndSelect("movimiento.grupos", "grupos")
          .leftJoinAndSelect("sesion.usuario", "sesionUsuario")
          .leftJoinAndSelect("operacion.operacionDetalle", "operacionDetalle")
          .leftJoinAndSelect("operacion.proyecto", "proyecto")
          .leftJoinAndSelect("operacion.movimientoTipo", "movimientoTipo")
          .leftJoinAndSelect("operacion.usuarios", "usuarios")
          .where("inventarioActual.id=:id", { id })
          .orderBy("movimiento.id", "DESC")
          .getMany()
      );
    } catch (error) {
      next(error);
    }
  };

  static obtenerId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id");

    try {
      const movimiento: Movimiento | null = await CommonController.obtenerIdQuery(funcionQueryId(id));
      if (movimiento == null) throw new AppError(`No existe el movimiento ${id}`, 404);
      res.json({ ...movimiento, saldoPendiente: await MovimientoService.saldoPendiente(movimiento.id) });
    } catch (error) {
      next(error);
    }
  };

  static obtenerGrupo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id"); //movimientoId
    try {
      res.json(
        await AppDataSource.getRepository(Movimiento)
          .createQueryBuilder("movimiento")
          .leftJoinAndSelect("movimiento.grupos", "grupos")
          .leftJoinAndSelect("grupos.grupoDetalle", "grupoDetalle")
          .leftJoin("grupoDetalle.proyecto", "proyecto")
          .leftJoin("grupoDetalle.movimientoTipo", "movimientoTipo")
          .addSelect("movimientoTipo.nombre")
          .addSelect("proyecto.nombre")
          .where("movimiento.id=:movimientoId", { movimientoId: id })
          .getOne()
      );
    } catch (error) {
      next(error);
    }
  };
}

export default MovimientoController;
