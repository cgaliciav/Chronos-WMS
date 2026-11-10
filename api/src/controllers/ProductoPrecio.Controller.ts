import { Request, Response, NextFunction } from "express";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { PrecioTipo } from "../entity/PrecioTipo";
import { ProductoPrecio } from "../entity/ProductoPrecio";
import { idSeguro } from "../helpers/ids";
/**
 * Tipos de precio (`precio_tipo`): 1 DEPRECIACION, 2 COMPRA ORIGEN, 3 RENTA INTERNA, 4 RENTA EXTERNA.
 * Decisión 13 (2026-11-08): la depreciación nunca se terminó de implementar y el sistema solo usa el precio original
 * (todas las consultas filtran `precioTipo.id = 2`). Los artículos nuevos solo guardan ese precio; los existentes
 * conservan sus cuatro filas. Antes se calculaban los otros tres con una fórmula defectuosa (hallazgo M5).
 */
const PRECIO_COMPRA_ORIGEN = 2;

const crearBaseProductoPrecio = async (
  precio: number | string,
  precioTipoId: number,
  sesionId: number,
  moneda: string = "MXP"
) => {
  const productoPrecio = new ProductoPrecio();
  productoPrecio.precioTipo = await AppDataSource.getRepository(PrecioTipo).findOneByOrFail(
    { id: precioTipoId }
  );
  productoPrecio.precio = +precio;
  productoPrecio.sesionId = sesionId;
  productoPrecio.moneda = moneda;

  return productoPrecio;
};

class ProductoPrecioController {
  // guardar Precio
  static guardar = async (
    productoPrecioOriginal: number | string,
    sesionId: number,
    moneda: string = "MXP",
    manager: EntityManager = AppDataSource.manager
  ) => {
    const precios = [await crearBaseProductoPrecio(productoPrecioOriginal, PRECIO_COMPRA_ORIGEN, sesionId, moneda)];

    return await manager.save(precios);
  };

  //  actualizar Precio
  static modificar = async (
    precio: number,
    productoPrecio: ProductoPrecio,
    sesionId: number,
    moneda: string = "MXP",
  ) => {
    productoPrecio.precio = precio;
    productoPrecio.sesionId = sesionId;
    productoPrecio.moneda = moneda;

    return await AppDataSource.getRepository(ProductoPrecio).save(productoPrecio);
  };

  // editar precios
  static editar = async (req: Request, res: Response, next: NextFunction) => {
    const { precio, moneda, productoPrecioId } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const productoPrecio = await AppDataSource.getRepository(ProductoPrecio).findOneByOrFail({ id: idSeguro(productoPrecioId, "productoPrecioId") });
      await ProductoPrecioController.modificar(
        Number(precio),
        productoPrecio,
        jwtPayload.si, // antes se pasaba el objeto jwtPayload completo (hallazgo M4)
        moneda,
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };

}

export default ProductoPrecioController;
