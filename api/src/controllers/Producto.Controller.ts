import { NextFunction, Request, Response } from "express";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { idSeguro } from "../helpers/ids";
import { Area } from "../entity/Area";
import { Producto } from "../entity/Producto";
import { ProductoTipo } from "../entity/ProductoTipo";
import CommonController from "./common/Common.Controller";
import ProductoCaracteristicaController from "./ProductoCaracteristica.Controller";
import ProductoClaveController from "./ProductoClave.Controller";
import ProductoPrecioController from "./ProductoPrecio.Controller";

const crearBaseProducto = async (
  titulo: string,
  descripcion: string,
  areaId: number | string,
  productoTipoId: number | string,
  productoCaracteristicas: { llave: string; valor: string }[],
  productoPrecioOriginal: number | string,
  productoCodigos: { barras: string; barrasTipo: string }[],
  sesionId: number,
  moneda: string = "MXP",
  manager: EntityManager = AppDataSource.manager,
) => {
  const producto = new Producto();
  producto.descripcion = descripcion;
  if (productoCaracteristicas.length > 0) {
    producto.productoCaracteristicas =
      await ProductoCaracteristicaController.guardar(
        productoCaracteristicas,
        sesionId,
        manager
      );
  }
  if (productoCodigos.length > 0) {
    producto.productoClaves = await ProductoClaveController.guardar(
      productoCodigos,
      sesionId,
      manager
    );
  }
  producto.productoPrecios = await ProductoPrecioController.guardar(
    productoPrecioOriginal,
    sesionId,
    moneda,
    manager,
  );
  producto.productoTipo = await AppDataSource.getRepository(ProductoTipo).findOneByOrFail(
    { id: idSeguro(productoTipoId, "productoTipoId") }
  );
  producto.sesionId = sesionId;
  producto.titulo = titulo;
  producto.archivos = [];
  producto.area = await AppDataSource.getRepository(Area).findOneByOrFail({ id: idSeguro(areaId, "areaId") });

  return producto;
};

class ProductoController {
  // guardar -- crear nuevo producto
  static guardar = async (
    titulo: string,
    descripcion: string,
    areaId: number | string,
    productoTipoId: number | string,
    productoCaracteristicas: { llave: string; valor: string }[],
    productoPrecioOriginal: number | string,
    productoCodigos: { barras: string; barrasTipo: string }[],
    sesionId: number,
    moneda: string = "MXP",
    manager: EntityManager = AppDataSource.manager,
  ) => {
    return await manager.save(
      await crearBaseProducto(
        titulo,
        descripcion,
        areaId,
        productoTipoId,
        productoCaracteristicas,
        productoPrecioOriginal,
        productoCodigos,
        sesionId,
        moneda,
        manager,
      )
    );
  };

  // quitar -- borrar nuevo producto

  static quitar = async (producto: Producto, sesionId: number) => {
    producto.sesionId = sesionId;
    await ProductoCaracteristicaController.quitar(
      producto.productoCaracteristicas,
      sesionId
    );
    //NO SE DEBEN BORRAR NI CLAVES NI PRECIOS YA DADOS DE ALTA.

    return AppDataSource.getRepository(Producto).remove(producto);
  };

  // AGREGAR COMENTARIO
  static agregarComentario = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { jwtPayload } = res.locals;
    const { id, comentario } = req.body;
    CommonController.agregarComentario(
      AppDataSource.getRepository(Producto),
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
      AppDataSource.getRepository(Producto),
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
          AppDataSource.getRepository(Producto),
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
        AppDataSource.getRepository(Producto),
        id,
        jwtPayload.si,
        archivoId
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };

  // editar
  static editar = async (req: Request, res: Response, next: NextFunction) => {
    const { areaId, productoTipoId, productoId, ...body } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const producto = await AppDataSource.getRepository(Producto).findOneOrFail({ where: { id: idSeguro(productoId, "productoId") }, 
        relations: { area: true, productoTipo: true },
        loadEagerRelations: false,
      });
      producto.area = await AppDataSource.getRepository(Area).findOneByOrFail({ id: idSeguro(areaId, "areaId") });
      producto.productoTipo = await AppDataSource.getRepository(ProductoTipo).findOneByOrFail(
        { id: idSeguro(productoTipoId, "productoTipoId") }
      );
      const resp = await CommonController.editarConRegistro(
        AppDataSource.getRepository(Producto),
        producto,
        body,
        jwtPayload.si
      );
      res.json(resp);
    } catch (error) {
      next(error);
    }
  };
}

export default ProductoController;
