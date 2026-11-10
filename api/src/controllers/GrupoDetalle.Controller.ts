import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { idOpcional, idSeguro } from "../helpers/ids";
import { GrupoDetalle } from "../entity/GrupoDetalle";
import { MovimientoTipo } from "../entity/MovimientoTipo";
import { Proyecto } from "../entity/Proyecto";
import { Usuario } from "../entity/Usuario";
import FacturaDetalleController from "./FacturaDetalle.Controller";
import InventarioDetalleController from "./InventarioDetalle.Controller";
import { AppError } from "../helpers/errorClases";
import { esTipo, MovimientoTipoId as T, TIPOS_LISTADO_NO_PERMITIDOS } from "../entity/common/MovimientoTipoId";

/** Listados nuevos (decisiones 11 y 12): ni BAJA* (5), que se sustituye por 13/16, ni tipos que no son movimientos. */
export const exigirTipoDeListadoValido = (movimientoTipoId: number | string, tipoActual?: number) => {
  const tipo = Number(movimientoTipoId);
  if (tipo === T.BAJA_LEGADO && tipoActual === T.BAJA_LEGADO) return; // listado antiguo que conserva su tipo
  if (esTipo(TIPOS_LISTADO_NO_PERMITIDOS, tipo)) {
    throw new AppError(
      tipo === T.BAJA_LEGADO
        ? "Los listados de bajas son de BAJA JUSTIFICADA (13) o BAJA INJUSTIFICADA (16)"
        : `El tipo ${tipo} (inventario o ajuste) no es un movimiento de almacén`,
      400
    );
  }
};

const crearBaseGrupoDetalle = async (
  proyectoId: number | string | undefined,
  movimientoTipoId: number | string,
  usuariosIds: (number | string)[] | undefined,
  sesionId: number
) => {
  exigirTipoDeListadoValido(movimientoTipoId);
  const grupoDetalle = new GrupoDetalle();

  // Sin proyecto (null o ausente) el listado queda sin proyecto. Con TypeORM 0.2, findOneOrFail(null) devolvía el
  // PRIMER proyecto y el listado quedaba asignado a él en silencio (plan 02 · fase 6).
  const idProyecto = idOpcional(proyectoId, "proyectoId");
  if (idProyecto !== undefined) {
    grupoDetalle.proyecto = await AppDataSource.getRepository(Proyecto).findOneByOrFail({ id: idProyecto });
  }

  if (usuariosIds !== undefined) {
    grupoDetalle.usuarios = await AppDataSource.getRepository(Usuario).findBy({ id: In(usuariosIds) });
  }

  grupoDetalle.movimientoTipo = await AppDataSource.getRepository(
    MovimientoTipo
  ).findOneByOrFail({ id: idSeguro(movimientoTipoId, "movimientoTipoId") });
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
    return await AppDataSource.getRepository(GrupoDetalle).save(grupoDetalle);
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
    return await AppDataSource.getRepository(GrupoDetalle).save(grupoDetalle);
  };

  static editar = async (
    grupoDetalle: GrupoDetalle,
    proyectoId: number | string,
    movimientoTipoId: number | string,
    usuariosIds: (number | string)[],
    sesionId: number
  ) => {
    //al editar tipoMovimiento o proyecto, hay que editar todos los movimientos asociados. --->> se hace en GrupoController
    exigirTipoDeListadoValido(movimientoTipoId, grupoDetalle.movimientoTipo?.id);
    grupoDetalle.sesionId = sesionId;
    grupoDetalle.movimientoTipo = await AppDataSource.getRepository(
      MovimientoTipo
    ).findOneByOrFail({ id: idSeguro(movimientoTipoId, "movimientoTipoId") });
    grupoDetalle.proyecto = await AppDataSource.getRepository(Proyecto).findOneByOrFail(
      { id: idSeguro(proyectoId, "proyectoId") }
    );
    grupoDetalle.usuarios = await AppDataSource.getRepository(Usuario).findBy({ id: In(usuariosIds) });
    return await AppDataSource.getRepository(GrupoDetalle).save(grupoDetalle);
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
    grupoDetalle.proyecto = await AppDataSource.getRepository(Proyecto).findOneByOrFail(
      { id: idSeguro(proyectoId, "proyectoId") }
    );
    grupoDetalle.usuarios = await AppDataSource.getRepository(Usuario).findBy({ id: In(usuariosIds ?? []) });
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

    return await AppDataSource.getRepository(GrupoDetalle).save(grupoDetalle);
  };

  static quitar = async (grupoDetalle: GrupoDetalle, sesionId: number) => {
    //borrar
    grupoDetalle.sesionId = sesionId;
    const grupoDetalleRemovido = await AppDataSource.getRepository(GrupoDetalle).remove(
      grupoDetalle
    );
    if (
      grupoDetalle.inventarioDetalle !== undefined &&
      grupoDetalle.inventarioDetalle !== null
    ) {
      await InventarioDetalleController.quitar(
        grupoDetalle.inventarioDetalle,
        sesionId
      );
    }
    if (
      grupoDetalle.facturaDetalle !== undefined &&
      grupoDetalle.facturaDetalle !== null
    ) {
      await FacturaDetalleController.quitar(grupoDetalle.facturaDetalle, sesionId);
    }
    return grupoDetalleRemovido;
  };
}

export default GrupoDetalleController;
