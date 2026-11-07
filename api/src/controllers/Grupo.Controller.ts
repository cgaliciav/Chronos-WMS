import { json } from "body-parser";
import { NextFunction, Request, Response } from "express";
import {
  Brackets,
  getConnection,
  getRepository,
  Not,
  SelectQueryBuilder,
} from "typeorm";
import { isJSDocReadonlyTag } from "typescript";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Grupo } from "../entity/Grupo";
import {
  InventarioActual,
  InventarioDisponible,
} from "../entity/InventarioActual";
import { Movimiento } from "../entity/Movimiento";
import { Sesion } from "../entity/Sesion";
import { AppError } from "../helpers/errorClases";
import CommonController from "./common/Common.Controller";
import GrupoDetalleController from "./GrupoDetalle.Controller";
import InventarioActualController, {
  crearBaseInventarioActual,
  queryBusquedaCatalogo,
  queryBusquedaCodigos,
  queryBusquedaProyecto,
} from "./InventarioActual.Controller";
import MovimientoController from "./Movimiento.Controller";
import ProductoController from "./Producto.Controller";
import { autogenerarCodigo } from "./ProductoClave.Controller";
// import { supabase } from "../helpers/_SupabaseConfig";
import { Movimientos } from '../entity-old/Movimientos';
import { obtenerGenerarArchivoComentarioSupabase, obtenerGenerarArchivoSupabase } from "./Archivo.Controller";

const condicionesWhereAnd = (filters: any) => {
  const condicionesWhere: string[] = [];
  console.log("condicionesWhereAnd GRUPO--------------------", filters);
  for (const key in filters) {
    if (filters[key] === null || filters[key] === undefined) continue;
    if (
      key.indexOf("nombre") >= 0 ||
      key.indexOf("barras") >= 0 ||
      key.indexOf("titulo") >= 0
    ) {
      condicionesWhere.push(`${key} LIKE '%${filters[key].pop()}%'`);
    } else if (key.indexOf("fecha") >= 0) {
      condicionesWhere.push(
        `(${key} BETWEEN ${filters[key][0]} AND ${filters[key][1]})`
      );
    } else {
      condicionesWhere.push(`${key} IN (${filters[key].join(",")})`);
    }
  }

  if (condicionesWhere.length > 0) {
    return condicionesWhere.join(" AND ");
  } else {
    return "";
  }
};

const funcionQueryListado = () => {
  return getRepository(Grupo)
    .createQueryBuilder("grupo")
    .leftJoinAndSelect("grupo.sesion", "sesion")
    .leftJoinAndSelect("sesion.usuario", "usuario")
    .leftJoin("grupo.movimientos", "movimientos")
    .addSelect("movimientos.id") // <<-- para poder contar cuantos movimientos tiene el grupo en el listado
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("grupoDetalle.proyecto", "proyecto")
    .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
    .leftJoinAndSelect("grupoDetalle.usuarios", "usuarios")
    .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")
    .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo");

  // .leftJoinAndSelect("grupo.movimientos","movimientos")
  // .leftJoinAndSelect("grupo.comentarios","comentarios")
  // .leftJoin("grupo.archivos","archivos")
  // .addSelect(['archivos.id','archivos.nombre','archivos.tipoMIME',,'archivos.tipo','archivos.tipoMIME','archivos.orden','archivos.nota'])
  // .leftJoin("comentarios.sesion","sesionComentarios")
  // .leftJoin("sesionComentarios.usuario","usuario")
  // .addSelect("usuario.nombre")
};

const funcionQueryListadoPorTipoMovimiento = (
  movimientoTipoId: number | string
) => {
  return getRepository(Grupo)
    .createQueryBuilder("grupo")
    .leftJoinAndSelect("grupo.sesion", "sesion")
    .leftJoinAndSelect("sesion.usuario", "usuario")
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
    .leftJoin("grupo.movimientos", "movimientos")
    .addSelect("movimientos.id") // <<-- para poder contar cuantos movimientos tiene el grupo en el listado
    .where("movimientoTipo.id=:movimientoTipoId", { movimientoTipoId });
  // .leftJoinAndSelect("grupo.movimientos","movimientos")
  // .leftJoinAndSelect("grupo.comentarios","comentarios")
  // .leftJoin("grupo.archivos","archivos")
  // .addSelect(['archivos.id','archivos.nombre','archivos.tipoMIME',,'archivos.tipo','archivos.tipoMIME','archivos.orden','archivos.nota'])
  // .leftJoin("comentarios.sesion","sesionComentarios")
  // .leftJoin("sesionComentarios.usuario","usuario")
  // .addSelect("usuario.nombre")
};

const funcionQueryInventario = () =>
  getRepository(Movimiento)
    .createQueryBuilder("movimiento")
    .leftJoin("movimiento.sesion", "sesionMovimiento")
    .leftJoin("sesionMovimiento.usuario", "usuario")
    .addSelect("usuario.nombre")
    .leftJoinAndSelect("movimiento.inventarioActual", "inventarioActual")
    .leftJoin("inventarioActual.bodega", "bodega")
    .addSelect("bodega.nombre")
    .leftJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoin("producto.area", "area")
    .addSelect("area.nombre")
    .leftJoin("producto.productoClaves", "productoClaves")
    .addSelect("productoClaves.barras")
    .leftJoin("producto.productoPrecios", "productoPrecios")
    .addSelect("productoPrecios.precio")
    .leftJoin("productoPrecios.precioTipo", "precioTipo")
    .addSelect("precioTipo.nombre")
    .innerJoin("movimiento.grupos", "grupo")
    .addSelect(["grupo.nombre", "grupo.id"])
    .leftJoin("movimiento.operacion", "operacion")
    .addSelect(["operacion.id"])
    .leftJoin("operacion.movimientoTipo", "movimientoTipo")
    .addSelect(["movimientoTipo.nombre"]);

const condicionesWhereAndInventarioPendiente = (filters: any) => {
  const condicionesWhere: string[] = [];
  for (const key in filters) {
    if (key.indexOf("nombre") || key.indexOf("correo")) {
      condicionesWhere.push(`${key} LIKE '%${filters[key].pop()}%'`);
    } else if (key.indexOf("fecha")) {
      condicionesWhere.push(
        `(${key} BETWEEN ${filters[key][0]} AND ${filters[key][1]})`
      );
    } else {
      condicionesWhere.push(`${key} IN (${filters[key].join(",")})`);
    }
  }
  condicionesWhere.push("operacion.id is NULL");

  if (condicionesWhere.length > 0) {
    return condicionesWhere.join(" AND ");
  } else {
    return "";
  }
};

const condicionesWhereAndPrestamosActivos = (filters: any) => {
  const condicionesWhere: string[] = [];
  console.log("filtersfiltersfiltersfiltersfilters", filters);
  for (const key in filters) {
    if (filters[key] === null || filters[key] === undefined) continue;
    if (key.indexOf("nombre") || key.indexOf("correo")) {
      condicionesWhere.push(`${key} LIKE '%${filters[key].pop()}%'`);
    } else if (key.indexOf("fecha")) {
      condicionesWhere.push(
        `(${key} BETWEEN ${filters[key][0]} AND ${filters[key][1]})`
      );
    } else {
      condicionesWhere.push(`${key} IN (${filters[key].join(",")})`);
    }
  }
  console.log(
    "condicionesWhereAndPrestamosActivoscondicionesWhereAndPrestamosActivos",
    condicionesWhere
  );

  if (condicionesWhere.length > 0) {
    return condicionesWhere.join(" AND ");
  } else {
    return "";
  }
};


const condicionesWhereAndInventarioHecho = (filters: any) => {
  const condicionesWhere: string[] = [];
  for (const key in filters) {
    if (key.indexOf("nombre") || key.indexOf("correo")) {
      condicionesWhere.push(`${key} LIKE '%${filters[key].pop()}%'`);
    } else if (key.indexOf("fecha")) {
      condicionesWhere.push(
        `(${key} BETWEEN ${filters[key][0]} AND ${filters[key][1]})`
      );
    } else {
      condicionesWhere.push(`${key} IN (${filters[key].join(",")})`);
    }
  }
  condicionesWhere.push("operacion.id is NOT NULL");

  if (condicionesWhere.length > 0) {
    return condicionesWhere.join(" AND ");
  } else {
    return "";
  }
  //CHECAR SI CUANDO SE ASIGNA UNA OPERACION HACE EL AJUSTE DE INVENTARIOACTUAL
};

const funcionQueryId = (id: number | string) => {
  return (
    getRepository(Grupo)
      .createQueryBuilder("grupo")
      // .leftJoinAndSelect("grupo.movimientos","movimientos")
      .leftJoinAndSelect("grupo.sesion", "sesionGrupo")
      // .addSelect("sesionGrupo.id")
      .leftJoinAndSelect("sesionGrupo.usuario", "usuarioGrupo")
      // .addSelect("usuarioGrupo.nombre")
      .leftJoinAndSelect("grupo.comentarios", "comentarios")
      .leftJoin("grupo.archivos", "archivos")
      .addSelect(["archivos.id"])
      .leftJoinAndSelect("comentarios.sesion", "sesionComentarios")
      // .addSelect("sesionComentarios.id")
      .leftJoinAndSelect("sesionComentarios.usuario", "usuario")
      // .addSelect("usuario.nombre")
      .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
      // .addSelect("grupoDetalle.id")
      .leftJoinAndSelect("grupoDetalle.proyecto", "proyecto")
      // .addSelect(["proyecto.nombre","esExterno"])
      .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
      // .addSelect(["movimientoTipo.id","movimientoTipo.nombre"])
      .leftJoinAndSelect("grupoDetalle.usuarios", "usuarios")
      // .addSelect(["usuarios.nombre"])
      .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
      // .addSelect(["facturaDetalle.id","facturaDetalle.numero","facturaDetalle.fechaEmision","facturaDetalle.total","facturaDetalle.impuestos","facturaDetalle.montoIngresado"])
      .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")
      // .addSelect(["proveedor.nombre","proveedor.id"])
      .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo")
      // .addSelect(["facturaTipo.nombre","facturaTipo.id"])
      .leftJoinAndSelect("grupoDetalle.inventarioDetalle", "inventarioDetalle")
      // .addSelect(["inventarioDetalle.id","inventarioDetalle.fechaInicio","inventarioDetalle.fechaFin"])
      .leftJoinAndSelect("inventarioDetalle.bodega", "bodega")
      // .addSelect(["bodega.nombre","bodega.id"])
      .where("grupo.id = :id", { id })
      .orderBy("comentarios.id", "DESC")
  );
};

const obtenerMovimientosConInventarioActual = async (
  grupoId: number | string
) =>
  await getRepository(Movimiento)
    .createQueryBuilder("movimientos")
    .innerJoinAndSelect("movimientos.grupos", "grupos")
    .leftJoinAndSelect("movimientos.inventarioActual", "inventarioActual")
    .where("grupos.id =:grupoId", { grupoId })
    .getMany();

const obtenerMovimientosConOperacionConInventarioActual = async (
  grupoId: number | string
) =>

  getRepository(Grupo)
    .createQueryBuilder("grupo")
    .leftJoinAndSelect("grupo.movimientos", "movimientos")
    .leftJoinAndSelect("movimientos.operacion", "operacionMovimientos")
    .leftJoinAndSelect("movimientos.inventarioActual", "inventarioActual")
    .leftJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoinAndSelect("producto.productoPrecios", "productoPrecios")
    .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
    .leftJoinAndSelect("operacionMovimientos.operacionDetalle", "operacionDetalle")
    .leftJoinAndSelect("operacionMovimientos.comentarios", "movimientosComentarios")
    .leftJoinAndSelect("movimientosComentarios.sesion", "movimientosComentariosSesion")
    .leftJoinAndSelect("movimientosComentariosSesion.usuario", "movimientosComentariosSesionUsuario")
    .leftJoin("operacionMovimientos.archivos", "archivosComentarios")
    .addSelect(["archivosComentarios.id"])
    .leftJoinAndSelect("grupo.sesion", "sesionGrupo")
    .leftJoinAndSelect("sesionGrupo.usuario", "usuarioGrupo")
    .leftJoinAndSelect("grupo.comentarios", "comentarios")
    .leftJoin("grupo.archivos", "archivos")
    .addSelect(["archivos.id"])
    .leftJoinAndSelect("comentarios.sesion", "sesionComentarios")
    .leftJoinAndSelect("sesionComentarios.usuario", "usuario")
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.proyecto", "proyecto")
    .leftJoinAndSelect("grupoDetalle.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("grupoDetalle.usuarios", "usuarios")
    .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
    .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")
    .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo")
    .leftJoinAndSelect("grupoDetalle.inventarioDetalle", "inventarioDetalle")
    .leftJoinAndSelect("inventarioDetalle.bodega", "bodega")
    .where("grupo.id = :grupoId", { grupoId })
    .getOne();


const obtenerMovimientosConOperacionDeGrupo = async (
  grupoId: number | string
) =>
  await getRepository(Movimiento)
    .createQueryBuilder("movimientos")
    .innerJoinAndSelect("movimientos.grupos", "grupos")
    .leftJoinAndSelect("movimientos.operacion", "operacion")
    .leftJoinAndSelect("operacion.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("operacion.proyecto", "proyecto")
    .leftJoinAndSelect("operacion.operacionDetalle", "operacionDetalle")
    .leftJoinAndSelect("operacion.usuarios", "usuarios")
    .where("grupos.id =:grupoId", { grupoId })
    .getMany();

const funcionQueryListadoPrestamosPendientes = (
  proyectoId: number | string,
  usuariosIds: (number | string)[],
  areasIds: (number | string)[],
  bodegasIds: (number | string)[]
) => {
  const subQuery = getConnection()
    .createQueryBuilder()
    .select("m.id", "movimientoId")
    .addSelect("o.fecha", "FechaOperacion")
    .addSelect("ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY o.fecha DESC)", "rn")
    .from("movimiento", "m")
    .innerJoin("operacion", "o", "o.id = m.operacionId")
    .innerJoin("inventario_actual", "ia", "ia.id = m.inventarioActualId")
    .innerJoin("producto", "p", "p.id = ia.productoId")
    .leftJoin("proyecto", "pj", "o.proyectoId = pj.id")
    .where("m.estatus = 'activo'")
    .andWhere("ia.disponible = 'no-disponible'");
  if (areasIds?.length > 0)
    subQuery.andWhere(`p.areaId IN (${areasIds.join(',')})`);

  if (proyectoId && proyectoId !== "0")
    subQuery.andWhere(`o.proyectoId=${proyectoId}`);

  if (usuariosIds?.length > 0) {
    subQuery.andWhere((qb) => {
      const operacionUsuariosSubQuery = qb
        .subQuery()
        .select("ou.operacionId")
        .from("operacion_usuarios_usuario", "ou")
        .where(`ou.usuarioId IN (${usuariosIds.join(',')})`)
        .getQuery();
      return "o.id IN " + operacionUsuariosSubQuery;
    });
  }

  console.log(">>>>>>>subQuery.getQuery()", subQuery.getQuery(), { areasIds, proyectoId, usuariosIds });

  const movimientosQry = getConnection().createQueryBuilder()
    .select("RankedMovimientos.movimientoId", "movimientoId")
    .from("(" + subQuery.getQuery() + ")", "RankedMovimientos")
    .setParameters(subQuery.getParameters())
    .where("rn = 1")
    .orderBy("RankedMovimientos.FechaOperacion", "DESC");



  console.log(">>>>>>>movimientosQry.getQuery()", movimientosQry.getQuery());

  return funcionQueryListadoMovimientos().where(
    "movimiento.id IN (" + movimientosQry.getQuery() + ")"
  );
};

const funcionQueryListadoMovimientos = () => {
  const builder = getRepository(Movimiento)
    .createQueryBuilder("movimiento")
    .leftJoinAndSelect("movimiento.sesion", "sesionMovimiento")
    .leftJoinAndSelect("sesionMovimiento.usuario", "usuario")
    .leftJoinAndSelect("movimiento.inventarioActual", "inventarioActual")
    .leftJoinAndSelect("inventarioActual.bodega", "bodega")
    .leftJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoin("producto.archivos", "archivos")
    .addSelect("archivos.id")
    .leftJoinAndSelect("producto.area", "area")
    .leftJoinAndSelect("producto.productoClaves", "productoClaves")
    .leftJoinAndSelect("producto.productoPrecios", "productoPrecios")
    .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
    .leftJoin("movimiento.grupos", "grupo")
    .addSelect(["grupo.id", "grupo.nombre"])
    .leftJoinAndSelect("grupo.comentarios", "gruposComentarios")
    .leftJoinAndSelect("movimiento.operacion", "operacion")
    .leftJoinAndSelect("operacion.movimientoTipo", "movimientoTipo")
    .leftJoinAndSelect("operacion.proyecto", "proyecto")
    .leftJoinAndSelect("operacion.usuarios", "operacionUsuarios")
    .leftJoinAndSelect("operacion.comentarios", "operacionComentarios")
    .leftJoinAndSelect("grupo.grupoDetalle", "grupoDetalle")
    .leftJoinAndSelect("grupoDetalle.facturaDetalle", "facturaDetalle")
    .leftJoinAndSelect("facturaDetalle.facturaTipo", "facturaTipo")
    .leftJoinAndSelect("facturaDetalle.proveedor", "proveedor")


  return builder;
  // .addSelect(["proyecto.nombre","proyecto.id"])
};

async function crearNuevoGrupoConMovimientosDeMovimientos(
  nombreNuevoGrupo: string,
  movimientosOrigen: Movimiento[],
  sesionId: number
) {
  const sesion = await getRepository(Sesion).findOneOrFail(sesionId);
  const nuevoGrupo = new Grupo();
  nuevoGrupo.nombre = nombreNuevoGrupo;
  nuevoGrupo.sesion = sesion;
  nuevoGrupo.sesionId = sesionId;
  nuevoGrupo.movimientos = await getRepository(Movimiento).save(
    movimientosOrigen.map((mov) => {
      const nuevoMov = new Movimiento();
      nuevoMov.cantidad = mov.cantidad;
      nuevoMov.inventarioActual = mov.inventarioActual;
      nuevoMov.sesion = sesion;
      nuevoMov.sesionId = sesionId;
      return nuevoMov;
    })
  );
  await getRepository(Grupo).save(nuevoGrupo);
  return {
    id: nuevoGrupo.id,
    nombre: nuevoGrupo.nombre,
    fecha: nuevoGrupo.fecha,
  };
}

async function crearNuevoGrupoConMovimientosDeInventariosActual(
  nombreNuevoGrupo: string,
  inventariosActual: InventarioActual[],
  sesionId: number
) {
  const sesion = await getRepository(Sesion).findOneOrFail(sesionId);
  const nuevoGrupo = new Grupo();
  nuevoGrupo.nombre = nombreNuevoGrupo;
  nuevoGrupo.sesion = sesion;
  nuevoGrupo.sesionId = sesionId;
  nuevoGrupo.movimientos = await getRepository(Movimiento).save(
    inventariosActual.map((inv) => {
      const nuevoMov = new Movimiento();
      nuevoMov.cantidad = inv.cantidad;
      nuevoMov.inventarioActual = inv;
      nuevoMov.sesion = sesion;
      nuevoMov.sesionId = sesionId;
      return nuevoMov;
    })
  );
  await getRepository(Grupo).save(nuevoGrupo);
  return {
    id: nuevoGrupo.id,
    nombre: nuevoGrupo.nombre,
    fecha: nuevoGrupo.fecha,
  };
}

class GrupoController {
  static quitar = async (grupo: Grupo | undefined, sesionId: number) => {
    if (grupo === undefined) throw new AppError("Grupo no definido");
    grupo.sesionId = sesionId;
    const grupoRemovido = await getRepository(Grupo).remove(grupo);

    await GrupoDetalleController.quitar(grupo.grupoDetalle, sesionId);

    return grupoRemovido;
  };

  // ** listaTabla
  static listaTabla = (req: Request, res: Response, next: NextFunction) => {
    CommonController.listaTablaQry(
      req.body,
      funcionQueryListado,
      condicionesWhereAnd
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  static listaTablaPorListado = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // console.log('............................................listaTablaPorListado',req.body);
    const { movimientoTipoId, ...body } = req.body;

    let fnQuery: () => SelectQueryBuilder<any>;

    if (movimientoTipoId !== undefined) {
      fnQuery = () =>
        funcionQueryListado().where("movimientoTipo.id=:movimientoTipoId", {
          movimientoTipoId,
        });
    } else {
      fnQuery = () => funcionQueryListado().where("grupoDetalle.id is NULL");
    }
    CommonController.listaTablaQryAnd(body, fnQuery, condicionesWhereAnd)
      .then((respuesta) => {
        // listado
        // console.log(respuesta.results);
        const { results, filtered, pagination } = respuesta;
        const resultadosAjustados = results.map((resultado) => {
          const { movimientos, ...restoResultado } = resultado;
          const movimientosTotales = resultado.movimientos.length;
          return {
            movimientosTotales,
            ...restoResultado,
          };
        });
        res.json({
          results: resultadosAjustados,
          filtered,
          pagination,
        });
      })
      .catch((error) => next(error));
  };


  static export2supabase = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      // const grupo = await CommonController.obtenerIdQuery(funcionQueryId(id));
      const grupo = await obtenerMovimientosConOperacionConInventarioActual(id);

      if (grupo === undefined) {
        throw new AppError(`Grupo no definido ${id}`);
      }
      // console.log('>>>>>>>>>>> grupo ', id);
      // const { data: existingOperation, error: existingError } = await supabase.from('operations').select().eq('old_id', grupo.id).maybeSingle();

      // if (existingError) {
      //   console.log('>>>>>>>>>>> Error Export2Supabase LOOKING FOR IT', existingError);
      //   throw new AppError('Error al BUSCAR EN Supabase');
      // }


      // const almacenistaId = grupo.sesion?.usuario?.id ?? null;
      // const responsableId = grupo.grupoDetalle?.usuarios?.length > 0 ? grupo.grupoDetalle?.usuarios[0].id : null;

      // const { data: warehouseUser } = almacenistaId ? await supabase.from('users').select().eq('old_id', almacenistaId).single() : { data: null };
      // const { data: responsibleUser } = almacenistaId ? await supabase.from('users').select().eq('old_id', responsableId).single() : { data: null };

      // const proyectoId = grupo.grupoDetalle?.proyecto?.id;
      // const { data: groupProject } = proyectoId ? await supabase.from('projects').select().eq('old_id', proyectoId).single() : { data: null };
      // let type = convertMovementType(grupo.grupoDetalle?.movimientoTipo?.id);
      // let operation_id: string = '';
      // if (existingOperation) {
      //   console.log(`Grupo ya exportado a Supabase ${id}`);
      //   // res.json({
      //   //   operation_id: existingOperation.id,
      //   //   old_group_id: grupo.id,
      //   //   type: existingOperation.type,
      //   // });
      //   operation_id = existingOperation.id;
      //   // return;
      // }
      // else {
      //   console.log(`Exportando a Supabase ${id}`);
      //   const newOperation = {
      //     title: grupo.nombre,
      //     type,
      //     responsible_user_id: responsibleUser?.id,
      //     project_id: groupProject?.id,
      //     // created_at: grupo.fecha.toISOString(),
      //     updated_at: grupo.fecha.toISOString(),
      //     old_id: grupo.id,
      //     warehouse_user_id: warehouseUser?.id,
      //     old_group_id: grupo.grupoDetalle?.id
      //   };
      //   console.log('>>>>>>>>>>> newOperation');


      //   // CREAR GRUPO EN SUPABASE
      //   const { data, error } = await supabase
      //     .from('operations')
      //     .insert(newOperation).select();

      //   if (error) {
      //     console.log('>>>>>>>>>>> Error Export2Supabase', error);
      //     throw new AppError('Error al exportar a Supabase', 500);
      //   }

      //   // GETTING THE OPERATION ID
      //   operation_id = data[0].id;
      // }





      // const newOperation = {
      //   title: grupo.nombre,
      //   type,
      //   responsible_user_id: responsibleUser?.id,
      //   project_id: groupProject?.id,
      //   // created_at: grupo.fecha.toISOString(),
      //   updated_at: grupo.fecha.toISOString(),
      //   old_id: grupo.id,
      //   warehouse_user_id: warehouseUser?.id,
      //   old_group_id: grupo.grupoDetalle?.id
      // };
      // console.log('>>>>>>>>>>> newOperation', newOperation);


      // // CREAR GRUPO EN SUPABASE
      // const { data, error } = await supabase
      //   .from('operations')
      //   .insert(newOperation).select();

      // if (error) {
      //   console.log('>>>>>>>>>>> Error Export2Supabase', error);
      //   throw new AppError('Error al exportar a Supabase', 500);
      // }

      // // GETTING THE OPERATION ID
      // const operation_id = data[0].id;




      const { movimientos, comentarios: comentariosGrupo, archivos: archivosGrupo } = grupo;

      // ****************************************************
      // ****** Agrego Comentarios de GRUPO a SUPABASE
      // ****************************************************
      // try {
      //   console.log('>>>>>>>>>>> importantdo Comentarios GRUPO',);

      //   comentariosGrupo?.forEach(async comentario => {
      //     const { data: dataUser, error: errorUser } = await supabase.from('users').select().eq('old_id', comentario.sesion.usuario.id).single();
      //     if (errorUser) {
      //       console.log("Error al obtener USER en SUPABASE", errorUser);
      //       throw new AppError("Error al insertar en SUPABASE", 500);
      //     }
      //     const { data: dataCommnet, error: errorComment } = await supabase.from('comments').insert([{ comment: comentario.comentario, created_at: comentario.fecha, updated_at: comentario.fecha, user_id: dataUser.id }]).select();
      //     if (errorComment) {
      //       console.log("Error al insertar COMMENT en SUPABASE", errorComment);
      //       throw new AppError("Error al insertar en SUPABASE", 500);
      //     }

      //     const { error: errorOperationComment } = await supabase.from('operation_comments').insert([{ operation_id, comment_id: dataCommnet[0].id }]);
      //     if (errorOperationComment) {
      //       console.log("Error al insertar OPERATION_COMMENT en SUPABASE", errorOperationComment);
      //       throw new AppError("Error al insertar en SUPABASE", 500);
      //     }
      //   });
      // } catch (error) {
      //   console.log('>>>>>>>>>>> Error Export2Supabase COMENTARIOS GRUPO', error);
      // }
      // ****************************************************
      // ****************************************************



      // ****************************************************
      // ****** AGREGO LAS IMAGENES de GRUPO a SUPABASE
      // ****************************************************
      // try {
      //   console.log('>>>>>>>>>>> importantdo archivosGrupo',);
      //   archivosGrupo?.forEach(async (archivo, idx) => {
      //     const { file_path, file_type } = await obtenerGenerarArchivoComentarioSupabase(archivo.id);  //Todas las imágenes guardadas son JPG a la resolución original
      //     const { data: dataCommnet, error: errorComment } = await supabase.from('comments').insert([{ comment: '', user_id: warehouseUser?.id, file_path, file_type }]).select();
      //     if (errorComment) {
      //       console.log("Error al insertar OPERATION_COMMENT en SUPABASE", errorComment);
      //       throw new AppError("Error al insertar en SUPABASE", 500);
      //     }
      //     const { error: errorOperationComment } = await supabase.from('operation_comments').insert([{ operation_id, comment_id: dataCommnet[0].id }]);
      //     if (errorOperationComment) {
      //       console.log("Error al insertar OPERATION_COMMENT en SUPABASE", errorOperationComment);
      //       throw new AppError("Error al insertar en SUPABASE", 500);
      //     }

      //   });
      // } catch (error) {
      //   console.log('>>>>>>>>>>> Error Export2Supabase ARCHIVOS GRUPO', error);
      // }
      // ****************************************************
      // ****************************************************


      let invoiceCurrency: string = 'MXP';
      // // console.log('>>>>>>>>>>> importantdo MOVIMIENTOS');

      // movimientos?.map(async (movimiento, idx) => {
      //   console.log('>>>>>>>>>>> importantdo MOVIMIENTO ', idx);

      //   const { operacion, inventarioActual: { producto } } = movimiento;
      //   const { productoPrecios } = producto;

      //   // console.log('>>>>>>>>>>> importantdo PRODUCTO', producto);

      //   const productoId = producto?.id;
      //   const { data: product } = productoId ? await supabase.from('products').select().eq('old_id', productoId).single() : null;


      //   const operation_price = productoPrecios?.length > 0 ? productoPrecios.find(op => op.precioTipo?.id === 2).precio : 0.00;

      //   const quantity = parseInt(`${movimiento.cantidad}`, 10);

      //   // console.log('>>>>>>>>>>> Insertando MOVIMIENTO', { operation_id, old_operation_id: operacion.id, old_movement_id: movimiento.id, });
      //   console.log('>>>>>>>>>>> Insertando MOVIMIENTO ', operation_id, operacion.id, movimiento.id);
      //   const { data, error } = await supabase
      //     .from('operation_details')
      //     .insert([{
      //       operation_id: operation_id,
      //       product_id: product?.id,
      //       quantity,
      //       created_at: operacion.fecha,
      //       updated_at: operacion.fecha,
      //       operation_price,
      //       old_operation_id: operacion.id,
      //       old_movement_id: movimiento.id,

      //     }])
      //     .select()
      //   if (error) {
      //     console.log('>>>>>>>>>>> Error Export2Supabase MOVIMIENTO', error);
      //     throw new AppError('Error al exportar a Supabase', 500);
      //   }


      //   // GETTING THE OPERATION_DETAIL ID
      //   const operation_detail_id = data[0].id;

      //   // 
      //   try {
      //     // ACTUALIZO EL TIPO DE OPERACION en caso de que no coincidan movimientos interntos con grupo
      //     if (idx === 0) {
      //       const operationType = convertMovementType(operacion.movimientoTipo?.id);


      //       if (type !== operationType) {
      //         console.log('>>>>>>>>>>> ACTUALIZANDO TIPO DE OPERACION', operationType);
      //         const { error: errorUpdate } = await supabase
      //           .from('operations')
      //           .update([{
      //             type: operationType
      //           }]).eq('id', operation_id);
      //         type = operationType;

      //         if (errorUpdate) {
      //           throw new AppError('Error al exportar a Supabase', 500);
      //         }
      //       }
      //     }
      //   } catch (error) {
      //     console.log('>>>>>>>>>>> Error Export2Supabase UPDATE OPERATION TYPE', error);

      //   }


      //   // ****************************************************
      //   // ****** Agrego Comentarios de OPERACION a SUPABASE
      //   // ****************************************************
      //   const { comentarios: comentariosOperacion, operacionDetalle } = operacion;
      //   // SE OBTIENE EL TIPO DE MONEDA PARA PODER USARSE EN LA FACTURA

      //   invoiceCurrency = operacionDetalle?.moneda ?? 'MXP';

      //   console.log('>>>>>>>>>>> importantdo Comentarios OPERACION ', operation_detail_id);

      //   try {
      //     comentariosOperacion?.forEach(async comentario => {
      //       const { data: dataUser, error: errorUser } = await supabase.from('users').select().eq('old_id', comentario.sesion.usuario.id).single();
      //       if (errorUser) {
      //         console.log("Error al obtener USER en SUPABASE", errorUser);
      //         throw new AppError("Error al insertar en SUPABASE ", 500);
      //       }
      //       const { data: dataCommnet, error: errorComment } = await supabase.from('comments').insert([{ comment: comentario.comentario, created_at: comentario.fecha, updated_at: comentario.fecha, user_id: dataUser.id }]).select();
      //       if (errorComment) {
      //         console.log("Error al insertar COMMENT en SUPABASE", errorComment);
      //         throw new AppError("Error al insertar en SUPABASE", 500);
      //       }

      //       const { error: errorOperationComment } = await supabase.from('operation_detail_comment').insert([{ operation_detail_id, comment_id: dataCommnet[0].id }]);
      //       if (errorOperationComment) {
      //         console.log("Error al insertar OPERATION_DETAIL_COMMENT en SUPABASE", errorOperationComment);
      //         throw new AppError("Error al insertar en SUPABASE", 500);
      //       }
      //     });
      //   } catch (error) {
      //     console.log('>>>>>>>>>>> Error Export2Supabase COMENTARIOS OPERACION', error);
      //   }
      //   // ****************************************************
      //   // ****************************************************



      //   // ****************************************************
      //   // ****** AGREGO LOS ARCHIVOS de OPERACION a SUPABASE
      //   // ****************************************************
      //   const { archivos: archivosOperacion } = operacion;
      //   console.log('>>>>>>>>>>> importantdo archivosOperacion', operation_detail_id);
      //   try {
      //     archivosOperacion?.forEach(async (archivo, idx) => {
      //       const { file_path, file_type } = await obtenerGenerarArchivoComentarioSupabase(archivo.id);  //Todas las imágenes guardadas son JPG a la resolución original
      //       const { data: dataCommnet, error: errorComment } = await supabase.from('comments').insert([{ comment: '', user_id: warehouseUser?.id, file_path, file_type }]).select();
      //       if (errorComment) {
      //         console.log("Error al insertar OPERATION_COMMENT en SUPABASE", errorComment);
      //         throw new AppError("Error al insertar en SUPABASE", 500);
      //       }
      //       const { error: errorOperationComment } = await supabase.from('operation_comments').insert([{ operation_detail_id, comment_id: dataCommnet[0].id }]);
      //       if (errorOperationComment) {
      //         console.log("Error al insertar OPERATION_COMMENT en SUPABASE", errorOperationComment);
      //         throw new AppError("Error al insertar en SUPABASE", 500);
      //       }

      //     });
      //   } catch (error) {
      //     console.log('>>>>>>>>>>> Error Export2Supabase ARCHIVOS OPERACION', error);
      //   }

      // });


      // let purchase_invoice_id = null;

      // try {
      //   if (type === 'purchase') {
      //     // Se agregan detalles de factura
      //     console.log('>>>>>>>>>>> importantdo FACTURA');

      //     const { facturaDetalle } = grupo.grupoDetalle;
      //     const { proveedor: { id: proveedorId }, facturaTipo: { id: facturaTipoId }, fechaEmision, numero: invoice_number } = facturaDetalle;
      //     const { data: supplier, error: errorSupplier } = await supabase.from('suppliers').select().eq('old_id', proveedorId).single();
      //     if (errorSupplier) {
      //       console.log('Error al obtener PROVEEDOR en SUPABASE', errorSupplier);
      //       throw new AppError('Error al exportar a Supabase', 500);
      //     }
      //     const { data: invoice, error: errorInvoice } = await supabase.from('purchase_invoices').insert([{
      //       operation_id,
      //       invoice_number,
      //       invoice_type: convertInvoiceType(facturaTipoId),
      //       invoice_date: fechaEmision.toISOString(),
      //       currency: invoiceCurrency,
      //       supplier_id: supplier.id,
      //     }]).select();

      //     if (errorInvoice) {
      //       console.log('Error al insertar FACTURA en SUPABASE', errorInvoice);
      //       throw new AppError('Error al exportar a Supabase', 500);
      //     }
      //     purchase_invoice_id = invoice[0].id;

      //   }
      // } catch (error) {
      //   console.log('>>>>>>>>>>> Error Export2Supabase FACTURA', { message: error.message, stack: error.stack, error });

      // }


      // // id uuid not null default uuid_generate_v4 (),
      // // title character varying(255) not null,
      // // type character varying(50) null,
      // // responsible_user_id uuid null,
      // // almacenista_user_id uuid null,
      // // project_id uuid null,
      // // created_at timestamp without time zone null default now(),
      // // updated_at timestamp without time zone null default now(),
      // // deleted_at timestamp without time zone null,
      // // old_id bigint null default '0'::bigint,
      // console.log("Group Created/Updated", {
      //   operation_id,
      //   old_group_id: grupo.id,
      //   type,
      //   // purchase_invoice_id
      // })

      res.json({
        // operation_id,
        old_group_id: grupo.id,
        // type
      });
    }
    catch (error) {
      next(error);
    }

    // await getRepository(Grupo).findOneOrFail(id, {
    //   relations: ["grupoDetalle", "grupoDetalle.movimientoTipo", "grupoDetalle.proyecto", "grupoDetalle.usuarios", "grupoDetalle.facturaDetalle", "grupoDetalle.facturaDetalle.proveedor", "grupoDetalle.facturaDetalle.facturaTipo"],
    // });


  }

  // ** obtenerId
  static obtenerId = (req: Request, res: Response, next: NextFunction) => {

    const { id } = req.params;

    CommonController.obtenerIdQuery(funcionQueryId(id))
      .then((registro) => {
        res.json(registro);
      })
      .catch((error) => next(error));
  };

  // **
  // PorProyecto
  //
  static listaTablaMovimientosPorProyecto = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el Id de grupo debe venir en los filters....
    const {
      proyectoId,
      movimientoTipoId,
      usuariosIds,
      areasIds,
      bodegasIds,
      ...body
    } = req.body;
    CommonController.listaTablaQryAnd(
      body,
      () => {
        const tiposMovimineto = Array.isArray(movimientoTipoId)
          ? movimientoTipoId
          : [movimientoTipoId];
        const result = funcionQueryListadoMovimientos().where(
          "proyecto.id=:proyectoId and movimientoTipo.id IN (:tiposMovimineto)",
          { proyectoId, tiposMovimineto }
        );
        if (usuariosIds?.length > 0) {
          result.andWhere(
            new Brackets((qb) =>
              qb
                .where("operacionUsuarios.id in (:usuariosIds)", {
                  usuariosIds,
                })
                .orWhere("usuario.id in (:usuariosIds)", { usuariosIds })
            )
          );
        }
        if (areasIds?.length > 0) {
          result.andWhere("area.id in (:areasIds)", { areasIds });
        }
        if (bodegasIds?.length > 0) {
          result.andWhere("bodega.id in (:bodegasIds)", { bodegasIds });
        }
        console.log(">>>>>>>>>>>>>>>>>>>listaTablaMovimientosPorProyecto>>>>\n", result.getSql());
        // result.getSql()
        return result;
      },
      condicionesWhereAnd
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  //** Tabla de Movimientos por Grupo */
  static listaTablaMovimientosPorGrupo = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el Id de grupo debe venir en los filters....
    const { grupoId, ...body } = req.body;
    const { usuarioBodegas, usuarioAreas } = res.locals;
    if (body.filters === undefined) {
      body.filters = {};
    }

    body["filters"]["area.id"] = usuarioAreas;
    body["filters"]["bodega.id"] = usuarioBodegas;

    console.log("listaTablaMovimientosPorGrupo", body);

    CommonController.listaTablaQryAnd(
      body,
      () => {
        return funcionQueryListadoMovimientos().where("grupo.id=:grupoId", {
          grupoId,
        });
      },
      condicionesWhereAnd
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** pendientes activos... debería funcionar tambien para rentas externas
  static listaTablaPendientesActivos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      proyectoId,
      usuariosIds,
      areasIds,
      bodegasIds,
      sortField,
      sortOrder,
      pagination,
      filters,
    } = req.body;

    const campoOrden: string = sortField ? sortField : "id";
    let direccion: string = "ASC";
    const page = pagination.current ? pagination.current : 1;
    const { pageSize } = pagination;
    const starts = pageSize * page - pageSize;

    try {
      if (sortOrder !== undefined) {
        direccion = sortOrder == "descend" ? "DESC" : "ASC";
      }

      const qryC = funcionQueryListadoPrestamosPendientes(
        proyectoId,
        usuariosIds,
        areasIds,
        bodegasIds
      );


      // console.log(
      //   "listaTablaPendientesActivos......................................",
      //   qryC.getSql()
      // );
      const conteoTotal = await qryC.getCount();
      const qry = funcionQueryListadoPrestamosPendientes(
        proyectoId,
        usuariosIds,
        areasIds,
        bodegasIds
      );

      console.log("listaTablaPendientesActivos params", {
        campoOrden,
        starts,
        direccion,
        pageSize,
      });

      console.log("listaTablaPendientesActivos cuantos", conteoTotal);

      const condicionesWhere = condicionesWhereAndPrestamosActivos(filters);
      if (condicionesWhere.length > 0) {
        console.log("condicionesWherecondicionesWhere", condicionesWhere);
        qry.andWhere(condicionesWhere);
      }
      const filtered = await qry.getCount();
      const qryResult = await qry
        .orderBy(campoOrden, direccion as "ASC" | "DESC")
        .skip(starts)
        .take(pageSize)
        .getMany();

      // const parte=qryResult.slice(starts,starts+pageSize);

      res.json({
        results: qryResult,
        filtered: conteoTotal,
        pagination: {
          current: page,
          pageSize,
          total: filtered,
          totalItems: conteoTotal,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ** crear lista de movimientos a partir de otro grupo
  static nuevoListadoDeGrupo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el id de grupo debe venir en filters
    const { nombreNuevoGrupo, filters } = req.body;

    const { jwtPayload } = res.locals;

    try {
      const qry = funcionQueryListadoMovimientos();

      const condicionesWhere = condicionesWhereAndPrestamosActivos(filters);
      if (condicionesWhere.length > 0) {
        qry.where(condicionesWhere);
      }
      const qryResult = await qry.getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeMovimientos(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoGeneral = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaCatalogo(body).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoCodigo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaCodigos(body).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoBajas = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaCatalogo({
        ...body,
        estados: [InventarioDisponible.BAJA],
      }).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  static nuevoListadoDeCatalogoProyectos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      // pagination,
      nombreNuevoGrupo,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const qryResult = await queryBusquedaProyecto(body).getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeInventariosActual(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // TODO nuevoListadoDeCatalogoFacturas
  // **
  static nuevoListadoDeCatalogoFacturas = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    next(new AppError("Funcion no implementada", 501));
  };

  // **

  static nuevoListadoDePendientesActivos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      proyectoId,
      usuariosIds,
      areasIds,
      bodegasIds,
      filters,
      nombreNuevoGrupo,
    } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const qry = funcionQueryListadoPrestamosPendientes(
        proyectoId,
        usuariosIds,
        areasIds,
        bodegasIds
      );

      const condicionesWhere = condicionesWhereAndPrestamosActivos(filters);
      if (condicionesWhere.length > 0) {
        qry.andWhere(condicionesWhere);
      }
      const qryResult = await qry.getMany();

      res.json(
        await crearNuevoGrupoConMovimientosDeMovimientos(
          nombreNuevoGrupo,
          qryResult,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // **
  // TODO nuevoListadoDeReporteUso
  static nuevoListadoDeReporteUso = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => { };

  // **
  // TODO nuevoListadoDeReporteMovimiento
  static nuevoListadoDeReporteMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => { };

  // ** nuevo
  static nuevo = async (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const grupo = new Grupo();
    grupo.sesion = await getRepository(Sesion).findOneOrFail(jwtPayload.si);
    CommonController.nuevo(getRepository(Grupo), grupo, req.body, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** nuevoConTipoMovimiento
  static nuevoConDetalle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { proyectoId, movimientoTipoId, usuariosIds, ...body } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const grupo = new Grupo();
      grupo.grupoDetalle = await GrupoDetalleController.guardar(
        proyectoId,
        movimientoTipoId,
        usuariosIds,
        jwtPayload.si
      );
      grupo.sesion = await getRepository(Sesion).findOneOrFail(jwtPayload.si);
      res.json(
        await CommonController.nuevo(
          getRepository(Grupo),
          grupo,
          body,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // ** nuevoCompra (factura)  -- esto tarda mucho???
  static nuevoConCompra = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      proyectoId,
      movimientoTipoId,
      usuariosIds,
      numero,
      fechaEmision,
      total,
      impuestos,
      montoIngresado,
      proveedorId,
      facturaTipoId,
      ...body
    } = req.body;
    const { jwtPayload } = res.locals;

    try {
      const grupo = new Grupo();
      grupo.sesion = await getRepository(Sesion).findOneOrFail(jwtPayload.si);
      grupo.grupoDetalle = await GrupoDetalleController.guardarFactura(
        proyectoId,
        movimientoTipoId,
        usuariosIds,
        numero,
        fechaEmision,
        total,
        impuestos,
        montoIngresado,
        proveedorId,
        facturaTipoId,
        jwtPayload.si
      );
      res.json(
        await CommonController.nuevo(
          getRepository(Grupo),
          grupo,
          body,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // nuevoInventario... no puede haber dos inventarios del mismo almacen (bodega) activos al mismo tiempo.
  // al crear un inventario, se crea su listado de pendientes.
  // **
  static nuevoConInventario = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { movimientoTipoId, fechaInicio, fechaFin, bodegaId, ...body } =
      req.body;
    const { jwtPayload } = res.locals;

    try {
      const grupo = new Grupo();
      // grupo.sesion=await getRepository(Sesion).findOneOrFail(jwtPayload.si);
      const sesion = await getRepository(Sesion).findOneOrFail(jwtPayload.si);
      grupo.sesion = sesion;

      grupo.grupoDetalle = await GrupoDetalleController.guardarInventario(
        movimientoTipoId,
        fechaInicio,
        fechaFin,
        bodegaId,
        jwtPayload.si
      );

      const inventarioActualCompleto = await getRepository(
        InventarioActual
      ).find({
        select: ["id", "estatus", "disponible"],
        where: {
          disponible: Not(InventarioDisponible.BAJA),
          estatus: EstatusEstado.ACTIVO,
        },
      });
      // const sesion=await getRepository(Sesion).findOneOrFail(jwtPayload.si);
      grupo.movimientos = inventarioActualCompleto.map((iac) => {
        const mov = new Movimiento();
        mov.cantidad;
        mov.inventarioActual = iac;
        mov.sesion = sesion;
        mov.sesionId = jwtPayload.si;
        return mov;
      });

      await CommonController.nuevo(
        getRepository(Grupo),
        grupo,
        body,
        jwtPayload.si
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };

  // **
  static obtenerListadoInventarioPendiente = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el id del grupo debe ir en filters

    CommonController.listaTablaQry(
      req.body,
      funcionQueryInventario,
      condicionesWhereAndInventarioPendiente
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // **
  static obtenerInventariosHechos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    //el id del grupo debe ir en filters

    CommonController.listaTablaQry(
      req.body,
      funcionQueryInventario,
      condicionesWhereAndInventarioHecho
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** eliminar  --> solo si no tiene nada
  static borrar = async (req: Request, res: Response, next: NextFunction) => {
    const { grupoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const movimientosGrupo = await getRepository(Movimiento)
        .createQueryBuilder("movimiento")
        .leftJoin("movimiento.grupos", "grupos")
        .where("grupos.id=:grupoId", { grupoId })
        .getCount();

      if (movimientosGrupo > 0) {
        throw new AppError("El grupo NO esta vacio, no se puede eliminar", 401);
      }

      const grupo = await funcionQueryId(grupoId).getOne();
      await GrupoController.quitar(grupo, jwtPayload.si);

      res.json();
    } catch (error) {
      next(error);
    }
  };

  //  **editar
  static editar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    CommonController.editar(getRepository(Grupo), req.body, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** editarConCompra
  static editarConCompra = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      grupoId,
      proyectoId,
      usuariosIds,
      numero,
      fechaEmision,
      total,
      impuestos,
      montoIngresado,
      proveedorId,
      facturaTipoId,
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const grupo = await funcionQueryId(grupoId).getOne();
      if (grupo === undefined) throw new AppError("Grupo ID no encontrado");
      const resp = await CommonController.editar(
        getRepository(Grupo),
        { nombre: numero, id: grupoId },
        jwtPayload.si
      );
      console.log("********************************* editarConCompra", {
        resp,
      });

      await GrupoDetalleController.editarFactura(
        grupo.grupoDetalle,
        proyectoId,
        usuariosIds,
        numero,
        fechaEmision,
        total,
        impuestos,
        montoIngresado,
        proveedorId,
        facturaTipoId,
        jwtPayload.si
      );

      (await obtenerMovimientosConOperacionDeGrupo(grupoId)).forEach(
        async (mov) => {
          console.log("***************************** editarConCompraMOV", {
            mov,
          });
          await MovimientoController.editarOperacion(
            mov,
            15,
            proyectoId,
            usuariosIds,
            jwtPayload.si
          );
        }
      );

      res.json();
    } catch (error) {
      next(error);
    }
  };

  // **
  static editarConInventario = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { grupoId, fechaInicio, fechaFin, bodegaId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const grupo = await funcionQueryId(grupoId).getOne();
      if (grupo === undefined) throw new AppError("Grupo ID no encontrado");

      await GrupoDetalleController.editarInventario(
        grupo.grupoDetalle,
        fechaInicio,
        fechaFin,
        bodegaId,
        jwtPayload.si
      );

      res.json();
    } catch (error) {
      next(error);
    }
  };

  // **
  static editarConDetalle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { grupoId, proyectoId, usuariosIds, movimientoTipoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const grupo = await funcionQueryId(grupoId).getOne();
      if (grupo === undefined) throw new AppError("Grupo ID no encontrado");

      await GrupoDetalleController.editar(
        grupo.grupoDetalle,
        proyectoId,
        movimientoTipoId,
        usuariosIds,
        jwtPayload.si
      );

      (await obtenerMovimientosConOperacionDeGrupo(grupoId)).forEach(
        async (mov) =>
          await MovimientoController.editarOperacion(
            mov,
            movimientoTipoId,
            proyectoId,
            usuariosIds,
            jwtPayload.si
          )
      );

      res.json();
    } catch (error) {
      next(error);
    }
  };

  // ** habilitar
  static habilitar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const { id } = req.params;
    CommonController.habilitar(getRepository(Grupo), id, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** deshabilitar
  static deshabilitar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const { id } = req.params;
    CommonController.deshabilitar(getRepository(Grupo), id, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** finalizar
  static finalizar = (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const { id } = req.params;
    CommonController.finalizar(getRepository(Grupo), id, jwtPayload.si)
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };
  // ** AGREGAR COMENTARIO
  static agregarComentario = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { jwtPayload } = res.locals;
    const { id, comentario } = req.body;
    CommonController.agregarComentario(
      getRepository(Grupo),
      id,
      jwtPayload.si,
      comentario
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** QUITAR COMENTARIO
  static quitarComentario = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { jwtPayload } = res.locals;
    const { id, idComentario } = req.body;
    CommonController.quitarComentario(
      getRepository(Grupo),
      id,
      jwtPayload.si,
      idComentario
    )
      .then((respuesta) => {
        res.json(respuesta);
      })
      .catch((error) => next(error));
  };

  // ** agregarArchivo
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
          getRepository(Grupo),
          id,
          jwtPayload.si,
          file
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // ** quitarArchivo
  static quitarArchivo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id, archivoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      await CommonController.quitarArchivo(
        getRepository(Grupo),
        id,
        jwtPayload.si,
        archivoId
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };

  // ** agregarMovimiento
  static agregarMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      codigo,
      cantidad,
      movimientoTipoId,
      proyectoId,
      usuariosIds,
      grupoId,
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      console.log("*************** agregarMovimiento", {
        codigo,
        cantidad,
        movimientoTipoId,
        proyectoId,
        usuariosIds,
        grupoId,
      });
      const inventarioActual =
        await InventarioActualController.obtenerInventarioActualDeCodigo(
          codigo
        );
      let movimiento: Movimiento;
      if (movimientoTipoId === undefined) {
        movimiento = await MovimientoController.guardar(
          cantidad,
          inventarioActual,
          jwtPayload.si
        );
      } else {
        if (
          movimientoTipoId == 15 ||
          movimientoTipoId == 14 ||
          movimientoTipoId == 1 ||
          movimientoTipoId == 2
        ) {
          // compra nueva
          throw new AppError(
            "No se pueden realizar operaciones de creacion de artículos en este listado",
            400
          );
        } else {
          //
          movimiento = await MovimientoController.guardarConOperacion(
            cantidad,
            inventarioActual,
            movimientoTipoId,
            proyectoId,
            usuariosIds,
            jwtPayload.si
          );
        }
      }
      if (movimiento !== undefined) {
        // agregar movimiento creado al grupo (listado)
        const grupo = await getRepository(Grupo).findOneOrFail(grupoId, {
          relations: ["movimientos"],
          loadEagerRelations: false,
        });
        grupo.movimientos.push(movimiento);
        await getRepository(Grupo).save(grupo);
      }
      res.json(movimiento);
    } catch (error) {
      next(error);
    }
  };

  // **
  static agregarMovimientoCompra = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      cantidad,
      movimientoTipoId,
      proyectoId,
      usuariosIds,
      precioUnitario,
      precioTotal,
      bodegaId,
      titulo,
      descripcion,
      areaId,
      moneda,
      productoTipoId,
      productoCaracteristicas,
      productoPrecioOriginal,
      productoCodigos,
      grupoId,
    } = req.body;
    const { jwtPayload } = res.locals;
    try {
      // const  inventarioActual = await InventarioActualController.obtenerInventarioActualDeCodigo(codigo);
      //crear inventarioActual
      const inventarioActual = await crearBaseInventarioActual(
        cantidad,
        bodegaId,
        jwtPayload.si
      );
      inventarioActual.producto = await ProductoController.guardar(
        titulo,
        descripcion,
        areaId,
        productoTipoId,
        productoCaracteristicas,
        productoPrecioOriginal,
        productoCodigos ?? [await autogenerarCodigo()],
        jwtPayload.si,
        moneda
      );
      const inventarioActualGuardado = await InventarioActualController.guardar(
        inventarioActual,
        jwtPayload.si
      );

      let movimiento: Movimiento;
      if (movimientoTipoId == 15) {
        movimiento = await MovimientoController.guardarConOperacionCompra(
          cantidad,
          inventarioActualGuardado,
          movimientoTipoId,
          proyectoId,
          usuariosIds,
          precioUnitario,
          precioTotal,
          jwtPayload.si,
          moneda,
        );
      } else if (
        movimientoTipoId == 14 ||
        movimientoTipoId == 1 ||
        movimientoTipoId == 2
      ) {
        //altas
        movimiento = await MovimientoController.guardarConOperacion(
          cantidad,
          inventarioActualGuardado,
          movimientoTipoId,
          proyectoId,
          usuariosIds,
          jwtPayload.si
        );
        // res.json(mov);
      } else {
        throw new AppError("Tipo de movimiento inválido", 400);
      }
      if (movimiento !== undefined) {
        // agregar movimiento creado al grupo (listado)
        const grupo = await getRepository(Grupo).findOneOrFail(grupoId, {
          relations: ["movimientos"],
          loadEagerRelations: false,
        });
        grupo.movimientos.push(movimiento);
        await getRepository(Grupo).save(grupo);
      }
      res.json(movimiento);
    } catch (error) {
      next(error);
    }
  };

  // ** agregarOperacionAMovimiento
  static agregarOperacionAMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { movimientoId, movimientoTipoId, proyectoId, usuariosIds } =
      req.body;
    const { jwtPayload } = res.locals;
    try {
      // LA SESION DEL MOVIMIENTO DEBE SER LA DEL ULTIMO QUE LA MODIFICA.
      // El grupo se queda con la sesion de quien lo creó. cada Movimiento
      res.json(
        await MovimientoController.agregarOperacion(
          await getRepository(Movimiento).findOneOrFail(movimientoId),
          movimientoTipoId,
          proyectoId,
          usuariosIds,
          jwtPayload.si
        )
      );
    } catch (error) {
      next(error);
    }
  };

  // ** quitarMovimiento
  static quitarMovimiento = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { movimientoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      MovimientoController.quitar(
        await getRepository(Movimiento)
          .createQueryBuilder("movimiento")
          .leftJoinAndSelect("movimiento.operacion", "operacion")
          .leftJoinAndSelect("operacion.operacionDetalle", "operacionDetalle")
          .leftJoinAndSelect("movimiento.inventarioActual", "inventarioActual")
          .where("movimiento.id=:movimientoId", { movimientoId })
          .getOne(),
        jwtPayload.si
      );
      //reactivar el movimiento previo

      res.json();
    } catch (error) {
      next(error);
    }
  };

  // Obtener la cantidad de nombres de grupos similares
  static obtenerCanteoNombresSimilares = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { nombre } = req.body;
    try {
      const qry = getRepository(Grupo)
        .createQueryBuilder("grupo")
        .where("grupo.nombre like :nombre", { nombre: `${nombre}%` })
        .getCount();
      const conteo = await qry;
      res.json({conteo});
    } catch (error) {
      next(error);
    }
  }
}

export default GrupoController;
export {
  funcionQueryListadoMovimientos,
  condicionesWhereAnd,
  funcionQueryListadoPrestamosPendientes,
  condicionesWhereAndPrestamosActivos,
};


function convertMovementType(id: number) {
  // 1	COMPRA*	activo
  // 2	ALTA*	activo
  // 3	PRÉSTAMO	activo
  // 4	DEVOLUCIÓN	activo
  // 5	BAJA*	activo
  // // 6	AJUSTE INVENTARIO	activo
  // // 7	TRANSFERENCIA ORIGEN	activo
  // // 8	BAJA EN INVENTARIO	activo
  // // 9	INVENTARIO	activo
  // // 10	AJUSTE DE ADMINISTRADOR	activo
  // 11	RENTA EXTERNA	activo
  // // 12	TRANSFERENCIA DESTINO	activo
  // 13	BAJA JUSTIFICADA	activo
  // 14	ALTA	activo
  // 15	COMPRA	activo
  // 16	BAJA INJUSTIFICADA	activo
  // 17	BAJA ADMINISTRADOR	activo  

  switch (id) {
    case 1:
    case 15:
      return "purchase";
    case 2:
    case 14:
      return "new";
    case 3:
      return "loan";
    case 4:
      return "return";
    case 5:
      return "elimination";
    case 11:
      return "rent";
    case 13:
      return "rid_allowed";
    case 16:
      return "rid_not_allowed";
    case 17:
      return "elimination";

    default:
      return "other";
  }

  // ('new'::character varying)::text,
  // ('purchase'::character varying)::text,
  // ('loan'::character varying)::text,
  // ('return'::character varying)::text,
  // ('rid_allowed'::character varying)::text,
  // ('rid_not_allowed'::character varying)::text,
  // ('rent'::character varying)::text,
  // ('other'::character varying)::text,
  // ('elimination'::character varying)::text

  // throw new Error("Function not implemented.");
}


function convertInvoiceType(id: number) {
  // 1	Fiscal nacional	activo
  // 2	Vale azul	activo
  // 3	Nota de compra	activo
  // 4	Extranjera	activo
  // 5	Ticket	activo
  // 6	Recibo / Comprobante	activo

  // ('tax-bill'::character varying)::text,
  //           ('purchase-note'::character varying)::text,
  //           ('foreign-bill'::character varying)::text,
  //           ('blue-voucher'::character varying)::text,
  //           ('ticket'::character varying)::text,
  //           ('receipt'::character varying)::text

  switch (id) {
    case 1:
      return "tax-bill";
    case 2:
      return "blue-voucher";
    case 3:
      return "purchase-note";
    case 4:
      return "foreign-bill";
    case 5:
      return "ticket";
    default:
      return "receipt";
  }
  // throw new Error("Function not implemented.");
}
