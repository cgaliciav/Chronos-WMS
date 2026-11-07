import { Request, Response, NextFunction } from "express";
import { getRepository, EntityManager, getManager } from "typeorm";
import { LogTipo } from "../entity/LogGeneral";
import { Parametros } from "../entity/Parametros";
import { PrecioTipo } from "../entity/PrecioTipo";
import { Producto } from "../entity/Producto";
import { ProductoPrecio } from "../entity/ProductoPrecio";
import LogGeneralController from "./LogGeneral.Controller";
import { idSeguro } from "../helpers/ids";
// 1	DEPRECIACION	activo
// 2	COMPRA ORIGEN	activo
// 3	RENTA INTERNA	activo
// 4	RENTA EXTERNA	activo

const obtenerPreciosAlMomento = async (productoId: number) => {
  return (
    await getRepository(Producto).findOneOrFail(productoId, {
      select: ["id"],
      relations: ["productoPrecios"],
      loadEagerRelations: false,
    })
  ).productoPrecios;
};

const obtenerPrecioDepreciacion = async (
  precio: number | string,
  edad: number
) => {
  // edad en años
  let porcentajeEdad: number[] = [0, 0, 0, 0];
  let porcentajeEdad5: number = 0;
  let minimoDepreciado: number = 0;
  try {
    //obtener depreciaciones en el tiempo
    porcentajeEdad[0] = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeEdad0" },
      })
    ).valor;
    porcentajeEdad[1] = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeEdad1" },
      })
    ).valor;
    porcentajeEdad[2] = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeEdad2" },
      })
    ).valor;
    porcentajeEdad[3] = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeEdad3" },
      })
    ).valor;
    porcentajeEdad[4] = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeEdad4" },
      })
    ).valor;
    porcentajeEdad5 = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeEdad5" },
      })
    ).valor;

    //obtener obtener mínimo de valor de un producto
    minimoDepreciado = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "minimoDepreciado" },
      })
    ).valor;
  } catch (error) {
    LogGeneralController.InsertarLog(
      LogTipo.ERROR,
      "No se encontró el (los) Parámetro(s) porcentajeEdad o minimoDepreciado",
      error
    );
  }

  const array5: number[] = [];
  for (let i = 5; i <= edad; i++) {
    array5.push(porcentajeEdad5);
  }

  porcentajeEdad.concat(array5);

  let precioFinal: number = porcentajeEdad.reduce(
    (acc, val, ci, array) => acc - acc * (1 - val),
    +precio
  );

  precioFinal = precioFinal < minimoDepreciado ? minimoDepreciado : precioFinal;

  return precioFinal;
};

const obtenerPrecioRentaInterna = async (precioDepreciado: number) => {
  // edad en años

  //obtener % de PrecioRenta
  let porcentajeRentaInterna: number = 0;
  let minimoRentaInterna: number = 0;
  try {
    porcentajeRentaInterna = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeRentaInterna" },
      })
    ).valor;
    minimoRentaInterna = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "minimoRentaInterna" },
      })
    ).valor;
  } catch (error) {
    LogGeneralController.InsertarLog(
      LogTipo.ERROR,
      "No se encontró el Parámetro porcentajeRentaInterna o minimoRentaInterna",
      error
    );
  }

  //obtener minimo valor de renta interna
  let precioFinal: number = precioDepreciado * porcentajeRentaInterna;
  precioFinal =
    precioFinal < minimoRentaInterna ? minimoRentaInterna : precioFinal;

  return precioFinal;
};

const obtenerPrecioRentaExterna = async (precioDepreciado: number) => {
  // edad en años
  //obtener % de PrecioRenta
  let porcentajeRentaExterna: number = 0;
  let minimoRentaExterna: number = 0;
  try {
    porcentajeRentaExterna = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "porcentajeRentaExterna" },
      })
    ).valor;
    minimoRentaExterna = +(
      await getRepository(Parametros).findOneOrFail({
        where: { llave: "minimoRentaExterna" },
      })
    ).valor;
  } catch (error) {
    LogGeneralController.InsertarLog(
      LogTipo.ERROR,
      "No se encontró el Parámetro porcentajeRentaExterna o minimoRentaExterna",
      error
    );
  }

  //obtener minimo valor de renta interna
  let precioFinal: number = precioDepreciado * porcentajeRentaExterna;
  precioFinal =
    precioFinal < minimoRentaExterna ? minimoRentaExterna : precioFinal;

  return precioFinal;
};

const crearBaseProductoPrecio = async (
  precio: number | string,
  precioTipoId: number,
  sesionId: number,
  moneda: string = "MXP"
) => {
  const productoPrecio = new ProductoPrecio();
  productoPrecio.precioTipo = await getRepository(PrecioTipo).findOneOrFail(
    precioTipoId
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
    manager: EntityManager = getManager()
  ) => {
    const precioDepreciado = await obtenerPrecioDepreciacion(
      productoPrecioOriginal,
      0
    );
    const precios = [
      await crearBaseProductoPrecio(
        productoPrecioOriginal,
        2,
        sesionId,
        moneda
      ),
      await crearBaseProductoPrecio(precioDepreciado, 1, sesionId, moneda),
      await crearBaseProductoPrecio(
        await obtenerPrecioRentaInterna(precioDepreciado),
        3,
        sesionId,
        moneda
      ),
      await crearBaseProductoPrecio(
        await obtenerPrecioRentaExterna(precioDepreciado),
        4,
        sesionId,
        moneda
      ),
    ];

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

    return await getRepository(ProductoPrecio).save(productoPrecio);
  };

  // editar precios
  static editar = async (req: Request, res: Response, next: NextFunction) => {
    const { precio, moneda, productoPrecioId } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const productoPrecio = await getRepository(ProductoPrecio).findOneOrFail(idSeguro(productoPrecioId, "productoPrecioId"));
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

  // TODO Actualizar precios en toda la base de datos.. o solo cuando sea necesario?

  // XXX Política de precios
  // hay un mínimo de valor inicialmente será 0
  // depreciar el producto cada año...hasta un máximo de 5 años...a partir del 6 año
  // valor de renta interna es un % del valor depreciado
  // valor de renta interna es un % del valor depreciado

  //
}

export default ProductoPrecioController;
