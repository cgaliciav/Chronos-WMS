import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";
import { GrupoDetalle } from "../entity/GrupoDetalle";
import { InventarioDetalle } from "../entity/InventarioDetalle";
import { MovimientoTipo } from "../entity/MovimientoTipo";
import { Proyecto } from "../entity/Proyecto";
import { Usuario } from "../entity/Usuario";
import FacturaDetalleController from "./FacturaDetalle.Controller";
import InventarioDetalleController from "./InventarioDetalle.Controller";

const crearBaseGrupoDetalle = async (
  proyectoId: number | string | undefined,
  movimientoTipoId: number | string,
  usuariosIds: (number | string)[] | undefined,
  sesionId: number
) => {
  const grupoDetalle = new GrupoDetalle();

  if (proyectoId !== undefined) {
    grupoDetalle.proyecto = await getRepository(Proyecto).findOneOrFail(
      proyectoId
    );
  }

  if (usuariosIds !== undefined) {
    grupoDetalle.usuarios = await getRepository(Usuario).findByIds(usuariosIds);
  }

  grupoDetalle.movimientoTipo = await getRepository(
    MovimientoTipo
  ).findOneOrFail(movimientoTipoId);
  grupoDetalle.sesionId = sesionId;

  return grupoDetalle;
};

class GrupoDetalleController {
  // guardar  -- basico con proyecto, tipoMovimiento, y usuarios
  static guardar = async (
    proyectoId: number | string | undefined,
    movimientoTipoId: number | string,
    usuariosIds: (number | string)[] | undefined,
    sesionId: number
  ) => {
    const grupoDetalle = await crearBaseGrupoDetalle(
      proyectoId,
      movimientoTipoId,
      usuariosIds,
      sesionId
    );
    return await getRepository(GrupoDetalle).save(grupoDetalle);
  };

  // guardarFactura  -- basico con proyecto, tipoMovimiento, y usuarios
  static guardarFactura = async (
    proyectoId: number | string,
    movimientoTipoId: number | string,
    usuariosIds: (number | string)[] | undefined,
    numero: string,
    fechaEmision: string | Date,
    total: number | string,
    impuestos: number | string,
    montoIngresado: number | string,
    proveedorId: number | string,
    facturaTipoId: number | string,
    sesionId: number
  ) => {
    const grupoDetalle = await crearBaseGrupoDetalle(
      proyectoId,
      movimientoTipoId,
      usuariosIds,
      sesionId
    );
    grupoDetalle.facturaDetalle = await FacturaDetalleController.guardar(
      numero,
      fechaEmision,
      total,
      impuestos,
      montoIngresado,
      proveedorId,
      facturaTipoId,
      sesionId
    );
    return await getRepository(GrupoDetalle).save(grupoDetalle);
  };

  // guardarInventario  -- basico con proyecto, tipoMovimiento, y usuarios
  static guardarInventario = async (
    movimientoTipoId: number | string,
    fechaInicio: string | Date,
    fechaFin: string | Date | undefined,
    bodegaId: number | string,
    sesionId: number
  ) => {
    const grupoDetalle = await crearBaseGrupoDetalle(
      undefined,
      movimientoTipoId,
      undefined,
      sesionId
    );
    grupoDetalle.inventarioDetalle = await InventarioDetalleController.guardar(
      fechaInicio,
      fechaFin,
      bodegaId,
      sesionId
    );
    return await getRepository(GrupoDetalle).save(grupoDetalle);
  };

  // editar
  static editar = async (
    grupoDetalle: GrupoDetalle,
    proyectoId: number | string,
    movimientoTipoId: number | string,
    usuariosIds: (number | string)[],
    sesionId: number
  ) => {
    //al editar tipoMovimiento o proyecto, hay que editar todos los movimientos asociados. --->> se hace en GrupoController
    grupoDetalle.sesionId = sesionId;
    grupoDetalle.movimientoTipo = await getRepository(
      MovimientoTipo
    ).findOneOrFail(movimientoTipoId);
    grupoDetalle.proyecto = await getRepository(Proyecto).findOneOrFail(
      proyectoId
    );
    grupoDetalle.usuarios = await getRepository(Usuario).findByIds(usuariosIds);
    return await getRepository(GrupoDetalle).save(grupoDetalle);
  };

  // editarFactura
  static editarFactura = async (
    grupoDetalle: GrupoDetalle,
    proyectoId: number | string,
    usuariosIds: (number | string)[] | undefined,
    numero: string,
    fechaEmision: string | Date,
    total: number | string,
    impuestos: number | string,
    montoIngresado: number | string,
    proveedorId: number | string,
    facturaTipoId: number | string,
    sesionId: number
  ) => {
    //al editar proyecto, hay que editar todos los movimientos asociados. --->> se hace en GrupoController
    grupoDetalle.sesionId = sesionId;
    grupoDetalle.proyecto = await getRepository(Proyecto).findOneOrFail(
      proyectoId
    );
    grupoDetalle.usuarios = await getRepository(Usuario).findByIds(usuariosIds);
    await FacturaDetalleController.editar(
      grupoDetalle.facturaDetalle,
      numero,
      fechaEmision,
      total,
      impuestos,
      montoIngresado,
      proveedorId,
      facturaTipoId,
      sesionId
    );

    return await getRepository(GrupoDetalle).save(grupoDetalle);
  };

  // editarInventario
  static editarInventario = async (
    grupoDetalle: GrupoDetalle,
    fechaInicio: string | Date,
    fechaFin: string | Date,
    bodegaId: number | string,
    sesionId: number
  ) => {
    //al editar movimiento o proyecto, hay que editar todos los movimientos asociados.--->> se hace en GrupoController
    await InventarioDetalleController.editar(
      grupoDetalle.inventarioDetalle,
      fechaInicio,
      fechaFin,
      bodegaId,
      sesionId
    );

    return grupoDetalle;
  };

  // quitar
  static quitar = async (grupoDetalle: GrupoDetalle, sesionId: number) => {
    //borrar
    grupoDetalle.sesionId = sesionId;
    const grupoDetalleRemovido = await getRepository(GrupoDetalle).remove(
      grupoDetalle
    );
    if (
      grupoDetalle.inventarioDetalle !== undefined &&
      grupoDetalle.inventarioDetalle !== null
    ) {
      InventarioDetalleController.quitar(
        grupoDetalle.inventarioDetalle,
        sesionId
      );
    }
    if (
      grupoDetalle.facturaDetalle !== undefined &&
      grupoDetalle.facturaDetalle !== null
    ) {
      FacturaDetalleController.quitar(grupoDetalle.facturaDetalle, sesionId);
    }
    return grupoDetalleRemovido;
  };
}

export default GrupoDetalleController;
