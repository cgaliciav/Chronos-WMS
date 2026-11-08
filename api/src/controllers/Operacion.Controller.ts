import { Request, Response, application, NextFunction } from "express";
import CommonController from "./common/Common.Controller";
import { getRepository } from "typeorm";
import { Operacion } from "../entity/Operacion";
import { MovimientoTipo } from "../entity/MovimientoTipo";
import { Proyecto } from "../entity/Proyecto";
import { Usuario } from "../entity/Usuario";
import OperacionDetalleController from "./OperacionDetalle.Controller";
import { AppError } from "../helpers/errorClases";
import { idOpcional, idSeguro, idsSeguros } from "../helpers/ids";
import { exigirProyectoEditable } from "../services/guardasRelacion";
import { MovimientoTipoId as T } from "../entity/common/MovimientoTipoId";

const crearBaseOperacion = async (
  tipoMovimientoId: number | string,
  proyectoId: number | string | undefined,
  usuariosIds: (number | string)[] | undefined,
  sesionId: number
) => {
  const operacion = new Operacion();
  operacion.movimientoTipo = await getRepository(MovimientoTipo).findOneOrFail(idSeguro(tipoMovimientoId, "movimientoTipoId"));
  const proyecto = idOpcional(proyectoId, "proyectoId");
  if (proyecto !== undefined) {
    operacion.proyecto = await getRepository(Proyecto).findOneOrFail(proyecto);
  }
  const usuarios = idsSeguros(usuariosIds, "usuariosIds");
  if (usuarios !== undefined) {
    operacion.usuarios = await getRepository(Usuario).findByIds(usuarios);
  }
  operacion.sesionId = sesionId;
  return operacion;
};

class OperacionController {
  static guardar = async (
    tipoMovimientoId: number | string,
    proyectoId: number | string | undefined,
    usuariosIds: (number | string)[] | undefined,
    sesionId: number
  ) => {
    return await getRepository(Operacion).save(
      await crearBaseOperacion(
        tipoMovimientoId,
        proyectoId,
        usuariosIds,
        sesionId
      )
    );
  };

  // guardarCompra
  static guardarConCompra = async (
    tipoMovimientoId: number | string,
    proyectoId: number | string | undefined,
    usuariosIds: (number | string)[] | undefined,
    precioUnitario: number | string,
    precioTotal: number | string,
    sesionId: number,
    moneda: string = "MXP",
  ) => {
    const operacion = await crearBaseOperacion(
      tipoMovimientoId,
      proyectoId,
      usuariosIds,
      sesionId
    );
    
    operacion.operacionDetalle = await OperacionDetalleController.guardar(
      precioUnitario,
      precioTotal,
      sesionId,
      moneda,
    );

    return await getRepository(Operacion).save(operacion);
  };

  // quitar --> quitar la operacion
  static quitar = async (operacion: Operacion, sesionId: number) => {
    // La relación puede no venir cargada (hallazgo M32)
    const detalle =
      operacion.operacionDetalle !== undefined
        ? operacion.operacionDetalle
        : (await getRepository(Operacion).findOne(operacion.id, { relations: ["operacionDetalle"], loadEagerRelations: false }))?.operacionDetalle;
    const operacionQuitada = await getRepository(Operacion).remove(operacion);
    await OperacionDetalleController.quitar(detalle, sesionId);
    return operacionQuitada;
  };

  // editar --> para actualizar tipo de movimiento o proyecto
  static modificar = async (
    operacion: Operacion,
    tipoMovimientoId: number | string,
    proyectoId: number | string,
    usuariosIds: (number | string)[],
    sesionId: number
  ) => {
    operacion.proyecto = await getRepository(Proyecto).findOneOrFail(
      proyectoId
    );

    //SOLO SE PUEDE CAMBIAR DE BAJA JUSTIFICADA A BAJA INJUSTIFICADA
    if (
      (operacion.movimientoTipo.id === T.BAJA_JUSTIFICADA && Number(tipoMovimientoId) === T.BAJA_INJUSTIFICADA) ||
      (operacion.movimientoTipo.id === T.BAJA_INJUSTIFICADA && Number(tipoMovimientoId) === T.BAJA_JUSTIFICADA)
    ) {
      operacion.movimientoTipo = await getRepository(
        MovimientoTipo
      ).findOneOrFail(tipoMovimientoId);
    } else if (operacion.movimientoTipo.id != tipoMovimientoId) {
      throw new AppError(
        "No se puede cambiar el tipo de operacion de un movimiento",
        400
      );
    }
    operacion.sesionId = sesionId;
    operacion.usuarios = await getRepository(Usuario).findByIds(usuariosIds);
    return await getRepository(Operacion).save(operacion);
    
  };

  static editar = async (req: Request, res: Response, next: NextFunction) => {
    const { operacionId, tipoMovimientoId, proyectoId, usuariosIds } = req.body;
    const { jwtPayload } = res.locals;

    try {
      await exigirProyectoEditable({ operacionId: idSeguro(operacionId, "operacionId") }, proyectoId);
      await OperacionController.modificar(
        await getRepository(Operacion).findOneOrFail(operacionId, {
          relations: ["movimientoTipo", "proyecto", "usuarios"],
        }),
        tipoMovimientoId,
        proyectoId,
        usuariosIds,
        jwtPayload.si
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };

  // agregarComentario
  static agregarComentario = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { jwtPayload } = res.locals;
    const { id, comentario } = req.body;
    CommonController.agregarComentario(
      getRepository(Operacion),
      id,
      jwtPayload.si,
      comentario
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // QUITAR COMENTARIO
  static quitarComentario = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { jwtPayload } = res.locals;
    const { id, idComentario } = req.body;
    CommonController.quitarComentario(
      getRepository(Operacion),
      id,
      jwtPayload.si,
      idComentario
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // agregarArchivo
  static agregarArchivo = async (
    req: any,
    res: Response,
    next: NextFunction
  ) => {
    const { file } = req;
    const { id } = req.body;
    const { jwtPayload } = res.locals;
    try {
      res.json(
        await CommonController.agregarArchivo(
          getRepository(Operacion),
          id,
          jwtPayload.si,
          file
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // quitarArchivo
  static quitarArchivo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id, archivoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      await CommonController.quitarArchivo(
        getRepository(Operacion),
        id,
        jwtPayload.si,
        archivoId
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };
}

export default OperacionController;
export { crearBaseOperacion };
