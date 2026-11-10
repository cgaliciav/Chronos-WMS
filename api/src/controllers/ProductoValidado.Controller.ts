import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Producto } from "../entity/Producto";
import { ProductoValidado, ValidacionEstado } from "../entity/ProductoValidado";
import { idSeguro } from "../helpers/ids";
import { logger } from "../helpers/logger";

export default class ProductoValidadoController {
  static guardar = async (
    productoId: number | string,
    nombre_comentario: string="",
    validacion: ValidacionEstado,
    sesionId: number,
  ) => {
    let productoValidado = await getRepository(ProductoValidado)
      .createQueryBuilder("productoValidado")
      .innerJoinAndSelect("productoValidado.producto", "producto")
      .where("producto.id = :productoId", { productoId })
      .getOne();
    logger.info({ productoValidado, productoId, validacion });
    if (productoValidado === undefined) {
      productoValidado = new ProductoValidado();
      productoValidado.estatus = EstatusEstado.ACTIVO;
      productoValidado.producto = await getRepository(Producto).findOneOrFail(idSeguro(productoId, "productoId"));
    }
    productoValidado.validacion = validacion;
    productoValidado.sesionId = sesionId;
    productoValidado.nombre = `${productoId}>>>${nombre_comentario}`;

    logger.info({ productoValidado });

    return await getRepository(ProductoValidado).save(productoValidado);
  };

  static Validar = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    logger.info("VALIDAR",{body:req.body});
    const { productoId, nombre: nombre_comentario = "" } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const respuesta = await ProductoValidadoController.guardar(
        productoId,
        nombre_comentario,
        ValidacionEstado.VALIDO,
        jwtPayload.si
      );
      res.json(respuesta);
    } catch (error) {
      next(error);
    }
  };

  static Invalidar = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { productoId, nombre: nombre_comentario = "" } = req.body;
    const { jwtPayload } = res.locals;
    logger.info("INVALIDAR", { body: req.body });
    try {
      const respuesta = await ProductoValidadoController.guardar(
        productoId,
        nombre_comentario,
        ValidacionEstado.INVALIDO,
        jwtPayload.si
      );
      res.json(respuesta);
    } catch (error) {
      next(error);
    }
  };

  static NoRevisado = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    logger.info("NOREVISADO", { body: req.body });
    const { productoId, nombre: nombre_comentario = "" } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const respuesta = await ProductoValidadoController.guardar(
        productoId,
        nombre_comentario,
        ValidacionEstado.NO_REVISADO,
        jwtPayload.si
      );
      res.json(respuesta);
    } catch (error) {
      next(error);
    }
  };
}
