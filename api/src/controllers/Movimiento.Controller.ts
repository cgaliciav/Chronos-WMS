import { NextFunction, Request, Response } from "express";
import { getConnection, getRepository } from "typeorm";
import {
  InventarioActual,
  InventarioDisponible,
} from "../entity/InventarioActual";
// import * as sharp from 'sharp';
import { Movimiento } from "../entity/Movimiento";
import {
  InventarioEstado,
  ProductoInventariado,
} from "../entity/ProductoInventariado";
import { Sesion } from "../entity/Sesion";
import { AppError } from "../helpers/errorClases";
import CommonController from "./common/Common.Controller";
import InventarioActualController from "./InventarioActual.Controller";
import InventarioActualHistoricoController from "./InventarioActualHistorico.Controller";
import OperacionController from "./Operacion.Controller";
import ProductoInventariadoController from "./ProductoInventariado.Controller";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Proyecto } from "../entity/Proyecto";
import { idSeguro } from "../helpers/ids";

const crearBaseMovimiento = async (
  cantidad: number,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  const movimiento = new Movimiento();
  movimiento.cantidad = cantidad;
  movimiento.inventarioActual = inventarioActual;
  movimiento.sesionId = sesionId;
  movimiento.sesion = await getRepository(Sesion).findOneOrFail(sesionId);
  return movimiento;
};

// -1	COMPRA*	activo
// -2	ALTA*	activo
// -3	PRÉSTAMO	activo
// -4	DEVOLUCIÓN	activo
// -5	BAJA*	activo
// -6	AJUSTE INVENTARIO	activo
// -7	TRANSFERENCIA ORIGEN	activo
// -8	BAJA EN INVENTARIO	activo
// -9	INVENTARIO	activo
// 10	AJUSTE DE ADMINISTRADOR	activo
// 11	RENTA EXTERNA	activo
// -12	TRANSFERENCIA DESTINO	activo
// -13	BAJA JUSTIFICADA	activo
// -14	ALTA	activo
// -15	COMPRA	activo
// -16	BAJA INJUSTIFICADA	activo
// -17	BAJA ADMINISTRADOR	activo

const aceptarDevolucionBaja = async (
  inventarioActualId: number,
  proyectoId: number | string
) => {
  const query = getConnection()
    .createQueryBuilder()
    .select("movimiento_id")
    .addSelect(
      `Sum(CASE 
            WHEN (movimientoTipo_id = 3 or movimientoTipo_id = 11 or movimientoTipo_id = 12 or movimientoTipo_id = 15) THEN movimiento_cantidad*-1
            WHEN (movimientoTipo_id = 4 or movimientoTipo_id = 7 or movimientoTipo_id = 13 or movimientoTipo_id = 16) THEN movimiento_cantidad
            ELSE 0 
            END)`,
      "estadoDevolucion"
    )

    .from((subq) => {
      let sq = subq
        .select("inventarioActual.id", "inventarioActual_id")
        .from(InventarioActual, "inventarioActual")
        .leftJoinAndSelect("inventarioActual.movimientos", "movimiento")
        .leftJoinAndSelect("movimiento.operacion", "operacion")
        .leftJoinAndSelect("operacion.proyecto", "proyecto")
        .leftJoinAndSelect("operacion.movimientoTipo", "movimientoTipo")
        .where("proyecto.id=:proyectoId", { proyectoId })
        .andWhere("inventarioActual.id=:inventarioActualId", {
          inventarioActualId,
        });
      return sq.groupBy("movimiento.id").orderBy("movimiento.id", "DESC");
    }, "movimientosOrdenados")
    .groupBy("inventarioActual_id");

  try {
    const registros = await query.getRawMany();
    if (registros.length === 0) {
      return false;
    }
    if (registros[0].estadoDevolucion == 0) {
      // no hay devoluciones ni bajas que aceptar
      return false;
    }
  } catch (error) {
    throw error;
  }

  return true;
};

const actualizarInventarioActualAlta = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  // await InventarioActualController.guardarHistorico(inventarioActual,sesionId);
  inventarioActual.cantidadAlmacen += +cantidad;
  inventarioActual.cantidad += +cantidad;
  inventarioActual.disponible = InventarioDisponible.DISPONIBLE;
  inventarioActual.sesionId = sesionId;
  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

const actualizarInventarioActualCompraOld = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  await InventarioActualController.guardarHistorico(inventarioActual, sesionId);
  inventarioActual.cantidadAlmacen += +cantidad;
  inventarioActual.cantidad += +cantidad;
  inventarioActual.disponible = InventarioDisponible.DISPONIBLE;
  inventarioActual.sesionId = sesionId;
  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

const actualizarInventarioActualCompra = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  // await InventarioActualController.guardarHistorico(inventarioActual,sesionId);
  inventarioActual.cantidadAlmacen += +cantidad;
  inventarioActual.sesionId = sesionId;
  inventarioActual.cantidad = 0;
  // if(inventarioActual.cantidad===0){
  inventarioActual.disponible = InventarioDisponible.NO_DISPONIBLE;
  // }
  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

const actualizarInventarioActualPrestamo = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  if (inventarioActual.cantidad === 0) {
    throw new AppError("NO HAY EXISTENCIA DISPONIBLE DEL ARTÍCULO", 400);
  }
  if (+cantidad > inventarioActual.cantidad) {
    throw new AppError(
      `NO HAY EXISTENCIA SUFICIENTE DEL ARTÍCULO. EXISTENCIA:${inventarioActual.cantidad}  SOLICITADO:${cantidad}`,
      400
    );
  }
  await InventarioActualController.guardarHistorico(inventarioActual, sesionId);
  inventarioActual.cantidad -= +cantidad;
  inventarioActual.sesionId = sesionId;
  if (inventarioActual.cantidad <= 0) {
    inventarioActual.disponible = InventarioDisponible.NO_DISPONIBLE;
  }

  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

const actualizarInventarioActualDevolucion = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  proyectoId: number | string,
  sesionId: number
) => {
  inventarioActual.sesionId = sesionId;
  if (inventarioActual.cantidad == inventarioActual.cantidadAlmacen) {
    throw new AppError(
      "EL ARTÍCULO NO INDICA QUE ESTÉ PRESTADO, POR FAVOR VERIFÍQUELO",
      400
    );
  }
  if (!(await aceptarDevolucionBaja(inventarioActual.id, proyectoId))) {
    throw new AppError(
      "NO SE PUEDE REALIZAR LA OPERACION, EL PRODUCTO YA ESTA DEVUELTO O NO ES DE ESTE PROYECTO",
      400
    );
  }
  const nuevaCantidad = Number(inventarioActual.cantidad) + Number(cantidad);

  if (nuevaCantidad > inventarioActual.cantidadAlmacen) {
    throw new AppError(
      "LA CANTIDAD A REGRESAR SOBREPASA EL LÍMITE DE cantidadAlmacen",
      400
    );
  }
  await InventarioActualController.guardarHistorico(inventarioActual, sesionId);

  // console.log('........actualizarInventarioActualDevolucion',{cantidad,inventarioActual})

  inventarioActual.cantidad = nuevaCantidad;
  inventarioActual.disponible = InventarioDisponible.DISPONIBLE;

  // console.log('........actualizarInventarioActualDevolucion 222',{cantidad,inventarioActual})

  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

const actualizarInventarioActualBaja = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  proyectoId: number | string,
  sesionId: number
) => {
  inventarioActual.sesionId = sesionId;

  if (!(await aceptarDevolucionBaja(inventarioActual.id, proyectoId))) {
    throw new AppError(
      "NO SE PUEDE REALIZAR LA OPERACION, EL PRODUCTO YA ESTA DEVUELTO O NO ES DE ESTE PROYECTO",
      400
    );
  }
  await InventarioActualController.guardarHistorico(inventarioActual, sesionId);

  // inventarioActual.cantidad -= +cantidad;
  inventarioActual.cantidadAlmacen = 0;
  inventarioActual.cantidad = 0;
  inventarioActual.disponible = InventarioDisponible.BAJA;
  // if (inventarioActual.cantidadAlmacen <= 0) {
  //   inventarioActual.disponible = InventarioDisponible.BAJA;
  //   inventarioActual.cantidadAlmacen = 0;
  // } else {
  //   inventarioActual.disponible = InventarioDisponible.NO_DISPONIBLE;
  // }

  // if (inventarioActual.cantidadAlmacen > inventarioActual.cantidad) {
  //   inventarioActual.cantidad = inventarioActual.cantidadAlmacen;
  // }

  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

const actualizarInventarioActualBajaSinProyecto = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  await InventarioActualController.guardarHistorico(inventarioActual, sesionId);
  inventarioActual.sesionId = sesionId;

  inventarioActual.cantidadAlmacen = 0;
  inventarioActual.cantidad = 0;
  inventarioActual.disponible = InventarioDisponible.BAJA;

  // inventarioActual.cantidadAlmacen -= +cantidad;
  // if (inventarioActual.cantidadAlmacen <= 0) {
  //   inventarioActual.disponible = InventarioDisponible.BAJA;
  //   inventarioActual.cantidadAlmacen = 0;
  // } else {
  //   inventarioActual.disponible = InventarioDisponible.NO_DISPONIBLE;
  // }

  // if (inventarioActual.cantidadAlmacen > inventarioActual.cantidad) {
  //   inventarioActual.cantidad = inventarioActual.cantidadAlmacen;
  // }

  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

const actualizarInventarioActualRentaExterna = async (
  cantidad: number | string,
  inventarioActual: InventarioActual,
  sesionId: number
) => {
  if (inventarioActual.cantidad === 0) {
    throw new AppError("NO HAY EXISTENCIA DISPONIBLE DEL ARTÍCULO", 400);
  }
  if (+cantidad > inventarioActual.cantidad) {
    throw new AppError(
      `NO HAY EXISTENCIA SUFICIENTE DEL ARTÍCULO. EXISTENCIA:${inventarioActual.cantidad}  SOLICITADO:${cantidad}`,
      400
    );
  }
  // El histórico se guarda DESPUÉS de validar; antes quedaba una instantánea huérfana si fallaba (hallazgo H20).
  await InventarioActualController.guardarHistorico(inventarioActual, sesionId);
  inventarioActual.cantidad -= +cantidad;
  inventarioActual.sesionId = sesionId;
  if (inventarioActual.cantidad <= 0) {
    inventarioActual.disponible = InventarioDisponible.NO_DISPONIBLE;
  }

  return await InventarioActualController.guardar(inventarioActual, sesionId);
};

// -1	COMPRA*	activo
// -15	COMPRA	activo
// -2	ALTA*	activo
// -14	ALTA	activo
// -5	BAJA*	activo
// -8	BAJA EN INVENTARIO	activo
// -13	BAJA JUSTIFICADA	activo
// -16	BAJA INJUSTIFICADA	activo
// -17	BAJA ADMINISTRADOR	activo
// -3	PRÉSTAMO	activo
// -4	DEVOLUCIÓN	activo
// -6	AJUSTE INVENTARIO	activo
// 10	AJUSTE DE ADMINISTRADOR	activo
// -7	TRANSFERENCIA ORIGEN	activo
// -12	TRANSFERENCIA DESTINO	activo
// -9	INVENTARIO	activo
// 11	RENTA EXTERNA	activo

const actualizarInventarioActual = async (
  cantidad: number,
  inventarioActual: InventarioActual,
  tipoMovimientoId: number | string,
  proyectoId: number | string,
  sesionId: number
) => {
  if (cantidad <= 0) {
    throw new AppError("La cantidad de operación debe ser mayor de 0", 400);
  }
  if (inventarioActual.disponible === InventarioDisponible.BAJA) {
    throw new AppError(
      "ARTÍCULO DADO DE BAJA. NO SE PERMITEN OPERACIONES",
      400
    );
  }
  // let invAct:InventarioActual;
  const {
    producto: { id: poroductoId },
  } = inventarioActual;
  switch (+tipoMovimientoId) {
    case 1:
      await actualizarInventarioActualCompraOld(
        cantidad,
        inventarioActual,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION COMPRA",
        InventarioEstado.INVENTARIO_POSITIVO,
        sesionId
      );
      break;
    case 15:
      await actualizarInventarioActualCompra(
        cantidad,
        inventarioActual,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION COMPRA",
        InventarioEstado.INVENTARIO_POSITIVO,
        sesionId
      );
      break;
    case 2:
    case 14:
      await actualizarInventarioActualAlta(
        cantidad,
        inventarioActual,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION ALTA",
        InventarioEstado.INVENTARIO_POSITIVO,
        sesionId
      );
      break;
    case 8:
    case 17:
      await actualizarInventarioActualBajaSinProyecto(
        cantidad,
        inventarioActual,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION BAJA",
        InventarioEstado.INVENTARIO_NEGATIVO,
        sesionId
      );
      break;
    case 5:
    case 13:
    case 16:
      await actualizarInventarioActualBaja(
        cantidad,
        inventarioActual,
        proyectoId,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION BAJA",
        InventarioEstado.INVENTARIO_NEGATIVO,
        sesionId
      );
      break;
    case 3:
      await actualizarInventarioActualPrestamo(
        cantidad,
        inventarioActual,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION PRESTAMO",
        InventarioEstado.INVENTARIO_POSITIVO,
        sesionId
      );
      break;
    case 4:
      await actualizarInventarioActualDevolucion(
        cantidad,
        inventarioActual,
        proyectoId,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION DEVOLUCION",
        InventarioEstado.INVENTARIO_POSITIVO,
        sesionId
      );
      break;
    case 7: // transferencia origen = devolucion
      await actualizarInventarioActualDevolucion(
        cantidad,
        inventarioActual,
        proyectoId,
        sesionId
      );
      // await ProductoInventariadoController.guardar(poroductoId,"OPERACION",InventarioEstado.INVENTARIO_POSITIVO,sesionId);
      break;
    case 12: // transferencia destino = prestamo
      await actualizarInventarioActualPrestamo(
        cantidad,
        inventarioActual,
        sesionId
      );
      // await ProductoInventariadoController.guardar(poroductoId,"OPERACION",InventarioEstado.INVENTARIO_POSITIVO,sesionId);
      break;
    case 11: // Renta Externa
      await actualizarInventarioActualRentaExterna(
        cantidad,
        inventarioActual,
        sesionId
      );
      await ProductoInventariadoController.guardar(
        poroductoId,
        "OPERACION RENTA EXTERNA",
        InventarioEstado.INVENTARIO_POSITIVO,
        sesionId
      );
      break;
  }

  return 0;
};

const agregarOperacionAMovimiento = async (
  movimiento: Movimiento,
  tipoMovimientoId: number | string,
  proyectoId: number | string | undefined,
  usuariosIds: (number | string)[] | undefined,
  sesionId: number
) => {
  movimiento.sesionId = sesionId;

  if (tipoMovimientoId != 15) {
    // si no es compra
    // guardar la operacion
    movimiento.operacion = await OperacionController.guardar(
      tipoMovimientoId,
      proyectoId,
      usuariosIds,
      sesionId
    );

    movimiento.sesion = await getRepository(Sesion).findOneOrFail(sesionId);

    // desactivar el movimiento anterior
    const movimientosActivos = await getRepository(Movimiento)
      .createQueryBuilder("movimiento")
      .where("movimiento.inventarioActual.id = :inventarioActualId", { inventarioActualId: movimiento.inventarioActual.id })
      .andWhere("movimiento.estatus = :estatus", { estatus: EstatusEstado.ACTIVO })
      .getMany();

    for (const movimientoActivo of movimientosActivos) {
      movimientoActivo.estatus = EstatusEstado.INACTIVO;
      movimientoActivo.sesion = movimiento.sesion;
      movimientoActivo.sesionId = sesionId;
      await getRepository(Movimiento).save(movimientoActivo);
    }

    // switch (+tipoMovimientoId) {
    //   case 5:
    //   case 13:
    //   case 16:
    //   //Baja
    //   case 8:
    //   case 17:
    //   //baja sin proyecto
    //   case 4:
    //     // devolucion

    //     break;
    // }

  } else {
    throw new AppError(
      "Tipo de movimiento no esperado... NO se esperaba COMPRA",
      401
    );
  }
  return await getRepository(Movimiento).save(movimiento);
};

const funcionQueryId = (id: number | string) => {
  return getRepository(Movimiento)
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

    .where("movimiento.id=:id", { id });
  // .andWhere("precioTipo.id=2")
  // .getOne()
};
class MovimientoController {
  // guardar - creacion de movimiento sin operacion
  static guardar = async (
    cantidad: number,
    inventarioActual: InventarioActual,
    sesionId: number
  ) => {
    return await getRepository(Movimiento).save(
      await crearBaseMovimiento(cantidad, inventarioActual, sesionId)
    );
  };

  // guardarConOperacion - creacion de movimiento con operacion
  static guardarConOperacion = async (
    cantidad: number,
    inventarioActual: InventarioActual,
    tipoMovimientoId: number | string,
    proyectoId: number | string,
    usuariosIds: (number | string)[] | undefined,
    sesionId: number
  ) => {
    const movimiento = await crearBaseMovimiento(
      cantidad,
      inventarioActual,
      sesionId
    );

    // validar operacion
    switch (+tipoMovimientoId) {
      case 5:
      //baja sin proyecto
      //Baja
      case 13:
      case 16:
      case 4:
        // devolucion

        const movimientoActual = await getRepository(Movimiento)
          .createQueryBuilder("movimiento")
          .leftJoinAndSelect("movimiento.operacion", "operacion")
          .leftJoinAndSelect("operacion.proyecto", "proyecto")
          .where("movimiento.inventarioActual.id = :inventarioActualId", { inventarioActualId: movimiento.inventarioActual.id })
          .andWhere("movimiento.estatus = :estatus", { estatus: EstatusEstado.ACTIVO })
          .orderBy("movimiento.id", "DESC")
          .getOne();
        if (movimientoActual === undefined) {
          throw new AppError("NO EXISTE MOVIMIENTO PREVIO", 404);
        }
        // obtener proyecto de proyectoId
        const proyectoMovimiento =
          proyectoId === undefined || proyectoId === null
            ? undefined
            : await getRepository(Proyecto).findOne(idSeguro(proyectoId, "proyectoId"), { loadEagerRelations: false });

        if (movimientoActual.operacion.proyecto.id !== +proyectoId) {
          throw new AppError(
            `El movimiento no pertenece al proyecto seleccionado ${proyectoMovimiento?.nombre}, es del proyecto: ${movimientoActual?.operacion?.proyecto?.nombre}`,
            401
          );

        }

        break;
    }

    const r = await actualizarInventarioActual(
      cantidad,
      inventarioActual,
      tipoMovimientoId,
      proyectoId,
      sesionId
    );
    return await agregarOperacionAMovimiento(
      movimiento,
      tipoMovimientoId,
      proyectoId,
      usuariosIds,
      sesionId
    );
  };

  static guardarConOperacionCompra = async (
    cantidad: number,
    inventarioActual: InventarioActual,
    tipoMovimientoId: number | string,
    proyectoId: number | string,
    usuariosIds: (number | string)[] | undefined,
    precioUnitario: number | string,
    precioTotal: number | string,
    sesionId: number,
    moneda: string = 'MXP',
  ) => {
    const movimiento = await crearBaseMovimiento(
      cantidad,
      inventarioActual,
      sesionId
    );
    if (tipoMovimientoId == 15) {
      // si no es compra
      await actualizarInventarioActual(
        cantidad,
        inventarioActual,
        tipoMovimientoId,
        proyectoId,
        sesionId
      );
      movimiento.operacion = await OperacionController.guardarConCompra(
        tipoMovimientoId,
        proyectoId,
        usuariosIds,
        precioUnitario,
        precioTotal,
        sesionId,
        moneda,
      );
    } else {
      throw new AppError(
        "Tipo de movimiento no esperado... Se esperaba COMPRA",
        401
      );
    }
    return await getRepository(Movimiento).save(movimiento);
  };

  // agregarOperacion -- agregar operacion a un movimiento dado
  static agregarOperacion = async (
    movimiento: Movimiento,
    tipoMovimientoId: number | string,
    proyectoId: number | string,
    usuariosIds: (number | string)[] | undefined,
    sesionId: number
  ) => {
    await actualizarInventarioActual(
      movimiento.cantidad,
      movimiento.inventarioActual,
      tipoMovimientoId,
      proyectoId,
      sesionId
    );
    return await agregarOperacionAMovimiento(
      movimiento,
      tipoMovimientoId,
      proyectoId,
      usuariosIds,
      sesionId
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

  //quitar
  static quitar = async (
    movimiento: Movimiento | undefined,
    sesionId: number
  ) => {
    if (movimiento === undefined) {
      throw new AppError("Movimiento desconocido", 400);
    }
    movimiento.sesionId = sesionId;
    const { inventarioActual } = movimiento;
    const movimientoQuitado = await getRepository(Movimiento).remove(
      movimiento
    );

    //-- reactivar el movimiento anterior
    const movimientoPrevio = await getRepository(Movimiento)
      .createQueryBuilder("movimiento")
      .leftJoinAndSelect("movimiento.operacion", "operacion")
      .leftJoinAndSelect("operacion.proyecto", "proyecto")
      .where("movimiento.inventarioActual.id = :inventarioActualId", { inventarioActualId: movimiento.inventarioActual.id })
      .andWhere("movimiento.estatus = :estatus", { estatus: EstatusEstado.INACTIVO })
      .orderBy("movimiento.id", "DESC")
      .getOne();

    if (movimientoPrevio !== undefined) {
      movimientoPrevio.estatus = EstatusEstado.ACTIVO;
      movimientoPrevio.sesion = await getRepository(Sesion).findOneOrFail(sesionId);
      await getRepository(Movimiento).save(movimientoPrevio);
    }
    //--


    if (movimiento.operacion !== undefined && movimiento.operacion !== null) {
      // revertir operacion

      // -- borrar operacion
      await OperacionController.quitar(movimiento.operacion, sesionId);
      // -- recuperando estado anterior del inventarioActual
      const inventarioActualHistorico =
        await InventarioActualHistoricoController.obtenerHistorico(
          inventarioActual.id
        );
      if (inventarioActualHistorico !== undefined) {
        inventarioActual.sesionId = sesionId;
        inventarioActual.cantidad = inventarioActualHistorico.cantidad;
        inventarioActual.cantidadAlmacen =
          inventarioActualHistorico.cantidadAlmacen;
        inventarioActual.disponible = inventarioActualHistorico.disponible;
        inventarioActual.estatus = inventarioActualHistorico.estatus;
        inventarioActual.fechaDisponibilidad =
          inventarioActualHistorico.fechaDisponibilidad;
        await getRepository(InventarioActual).save(inventarioActual);
        await InventarioActualHistoricoController.quitar(
          inventarioActualHistorico,
          sesionId
        );
      }
      // if(inventarioActualHistorico === undefined){

      //   await getRepository(InventarioActual).delete(inventarioActual.id);
      // }
    }
    return movimientoQuitado;
  };

  static obtenerUltimoMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params; //inventarioActualId
    // const {jwtPayload}=res.locals;
    try {
      res.json(
        await getRepository(Movimiento)
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
    const { id } = req.params; //inventarioActualId
    // const {jwtPayload}=res.locals;
    try {
      res.json(
        await getRepository(Movimiento)
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
    const { id } = req.params;

    // const {jwtPayload}=res.locals;
    try {
      res.json(await CommonController.obtenerIdQuery(funcionQueryId(id)));
    } catch (error) {
      next(error);
    }
  };

  static obtenerGrupo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params; //movimientoId
    // const {jwtPayload}=res.locals;
    try {
      res.json(
        await getRepository(Movimiento)
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
