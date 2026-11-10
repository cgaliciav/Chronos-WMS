import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Producto } from "../entity/Producto";
import { ProductoInventariado, InventarioEstado } from "../entity/ProductoInventariado";
import { Sesion } from "../entity/Sesion";
import { idSeguro, parametro } from "../helpers/ids";
import { logger } from "../helpers/logger";
// import { ProductoInventariado, ValidacionEstado } from "../entity/ProductoInventariado";

export default class ProductoInventariadoController {
  static guardar = async (
    productoId: number | string,
    nombre_comentario: string="",
    validacion: InventarioEstado,
    sesionId: number,
  ) => {
    // let productoInventariado = await getRepository(ProductoInventariado)
    //   .createQueryBuilder("productoInventariado")
    //   .innerJoinAndSelect("productoInventariado.producto", "producto")
    //   .where("producto.id = :productoId", { productoId })
    //   .getOne();
    // console.log({ productoInventariado, productoId, validacion });
    // if (productoInventariado === undefined) {
    // }
    const productoInventariado = new ProductoInventariado();
    productoInventariado.estatus = EstatusEstado.ACTIVO;
    productoInventariado.producto = await getRepository(Producto).findOneOrFail(idSeguro(productoId, "productoId"));
    productoInventariado.validacion = validacion;
    productoInventariado.sesionId = sesionId;
    productoInventariado.sesion = await getRepository(Sesion).findOneOrFail(idSeguro(sesionId, "sesionId"));
    
    productoInventariado.nombre = `${nombre_comentario}>>>${Math.trunc(Math.random()*10000000000000)}`;

    return await getRepository(ProductoInventariado).save(productoInventariado);
  };

  static InventarioExiste = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    logger.info("ProductoInventariadoController-InventarioExiste",{body:req.body});
    const { productoId, nombre: nombre_comentario = "" } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const respuesta = await ProductoInventariadoController.guardar(
        productoId,
        nombre_comentario,
        InventarioEstado.INVENTARIO_POSITIVO,
        jwtPayload.si
      );
      res.json(respuesta);
    } catch (error) {
      next(error);
    }
  };

  static InventarioNoExiste = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    const { productoId, nombre: nombre_comentario = "" } = req.body;
    const { jwtPayload } = res.locals;
    logger.info("ProductoInventariadoController-InventarioNoExiste", { body: req.body });
    try {
      const respuesta = await ProductoInventariadoController.guardar(
        productoId,
        nombre_comentario,
        InventarioEstado.INVENTARIO_NEGATIVO,
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
    logger.info("ProductoInventariadoController - NOREVISADO", { body: req.body });
    const { productoId, nombre: nombre_comentario = "" } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const respuesta = await ProductoInventariadoController.guardar(
        productoId,
        nombre_comentario,
        InventarioEstado.NO_REVISADO,
        jwtPayload.si
      );
      res.json(respuesta);
    } catch (error) {
      next(error);
    }
  };

  static Detalle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    logger.info("ProductoInventariadoController - DETALLE", { param: req.params });
    const id = parametro(req, "id");
    //const { jwtPayload } = res.locals;
    try {
      const respuesta = await getRepository(Producto).findOneOrFail(id);      
      res.json(respuesta.productoInventarios);
    } catch (error) {
      next(error);
    }
  };


}
