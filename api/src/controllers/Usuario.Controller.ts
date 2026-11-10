import { In } from "typeorm";
import { validate } from "class-validator";
import { OPCIONES_VALIDACION } from "../helpers/validacion";
import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Area } from "../entity/Area";
import { Bodega } from "../entity/Bodega";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Proyecto } from "../entity/Proyecto";
import { Rol } from "../entity/Rol";
import { Usuario } from "../entity/Usuario";
import EnviarMail from "../helpers/enviarMail";
import { AppError } from "../helpers/errorClases";
import passGenerator from "../helpers/passGenerator";
import CommonController, { ResultadoTabla } from "./common/Common.Controller";
import { aplicarFiltros, columnaSegura, construirFiltros, direccionSegura } from "../helpers/filtrosTabla";
import { logger } from "../helpers/logger";
import { idSeguro, parametro } from "../helpers/ids";

// Filtros de la tabla de usuarios, parametrizados (hallazgo C1). `estatusExtendido` es una columna calculada.
const ESTATUS_EXTENDIDO = 'if(usuario.estatus="inactivo","inactivo",if(usuario.vencimiento <= current_timestamp() ,"vencido","activo"))';
const condicionesWhereAnd = (filters: any) =>
  construirFiltros(filters, {
    alias: "usuario",
    especiales: (llave, valores, parametro) =>
      llave === "estatusExtendido" ? `(${ESTATUS_EXTENDIDO}) IN (${valores.map(parametro).join(",")})` : undefined,
  });

class UsuarioController{

  static listaSimple = async (req: Request, res: Response,next:NextFunction) =>{
    try {
      res.json(await CommonController.listaSimpleGenerica(
        AppDataSource.getRepository(Usuario),
        ["id","nombre"]
      )); 
    } catch (error) {
      next(error)
    }

  }

  static listaSimpleCompletaDinamica = async (req: Request, res: Response, next: NextFunction) => {
    const {busqueda}= req.body;
    try {
      res.json(await CommonController.BusquedaListaSimpleCompleta(
        AppDataSource.getRepository(Usuario),
        ["id","nombre"],
        busqueda) 
        );
    } catch (error) { 
      next (error);
    }
  } 

  static listaSimpleCompleto = async (req: Request, res: Response,next:NextFunction) =>{
    try{
      res.json( await CommonController.BusquedaListaSimpleCompleta(
        AppDataSource.getRepository(Usuario),
        ["id","nombre"]) 
        );
    }catch(error){
      next(error);
    }
  }

//TABLA SEGUN LO REQUIEREN LAS TABLAS DE ANTD
  static listaTabla = async (req: Request, res: Response,next:NextFunction) =>{
    try {
      const {sortField, sortOrder, pagination, filters} = req.body;
      const campoOrden = columnaSegura(sortField, "usuario.id");
      const direccionOrden = direccionSegura(sortOrder);
      const page = (pagination.current===undefined?1:pagination.current);
      const {pageSize} = pagination;                
      let starts = pageSize*page - pageSize;

  
      const queryVencimiento = AppDataSource.getRepository(Usuario)
      .createQueryBuilder("usuario")
      .select(["usuario.id"])
      .addSelect(ESTATUS_EXTENDIDO,"estatusExtendido")
      
      const filtros = condicionesWhereAnd(filters);
      aplicarFiltros(queryVencimiento, filtros);

      const filtered= await queryVencimiento.getCount();
      // Sin filtros el total es el mismo conteo: una consulta menos por página (antes 2-3 COUNT, hallazgo M14).
      const hayFiltro = filtros.sql.length > 0;
      const totalItems = hayFiltro ? await AppDataSource.getRepository(Usuario).count() : filtered;
      const queryVencimientoResult = await queryVencimiento.orderBy(campoOrden,direccionOrden)
        .skip(starts)
        .take(pageSize)
        .getRawMany();


      const queryResult = await AppDataSource.getRepository(Usuario)
        .find({
          where: { id: In(queryVencimientoResult.map(qvr=>qvr.usuario_id)) },
          relations:{ roles: true, areas: true, bodegas: true, proyectos: true },
        }); 

      // Se regresa el objeto con la estructura de Usuario agregando de 'estatusExtendido'
      const respuesta:ResultadoTabla={
        results:queryVencimientoResult.map(qv=>({
          ...queryResult.filter(qr=>qr.id===qv.usuario_id).pop(),
          estatusExtendido: qv.estatusExtendido,
          })),
        filtered,
        pagination:{
          current:page,
          pageSize,
          total:filtered,
          totalItems
        }

      } 
      
      res.json( respuesta )

    } catch (error) {
        next(error);
    }

  }

  //Obtener datos generales y los roles del usuario que hace la peticion
  static actual = (req: Request, res: Response, next:NextFunction) =>{
    const {jwtPayload}=res.locals;
    logger.info(`actual>>>>> ${jwtPayload.u}`);
    CommonController.obtenerId(
      AppDataSource.getRepository(Usuario),
      ["roles"],
      jwtPayload.ui
    )
    .then(usuario=>{
      const {roles,...usuarioSinRoles}=usuario;
      res.json({ ...usuarioSinRoles,roles:roles.map(r=>r.codigoRol) });
    })
    .catch(error=> next(error));
  }

  //obtener datos del usuario por ID. solo para administradores
  // incluye todo: areas,bodegas, proyectos
  static obtenerId = (req: Request, res: Response, next:NextFunction) =>{
    const id = parametro(req, "id");
    CommonController.obtenerId(
      AppDataSource.getRepository(Usuario),
      ["areas","bodegas","proyectos","comentarios","roles"],
      id
    )
    .then(usuario=>{
      res.json({ ...usuario });
    })
    .catch(error => next(error));
  }

  static obtenerAreas = async (req: Request, res: Response,next:NextFunction) => {
    const { ui } = res.locals.jwtPayload;
    try {
      const usuarioAreas = await AppDataSource.getRepository(Usuario)
        .createQueryBuilder("usuario")
        .leftJoinAndSelect("usuario.areas", "areas")
        .where("usuario.id = :ui", { ui })
        .andWhere("areas.estatus=:edo", { edo: EstatusEstado.ACTIVO })
        .getOne();
      res.json(usuarioAreas.areas)
    } catch (error) {
      next(error);      
    }
  }

  static obtenerBodegas = async (req: Request, res: Response,next:NextFunction) => {
    let { ui } = res.locals.jwtPayload;
    try {
      const usuarioBodegas = await AppDataSource.getRepository(Usuario)
        .createQueryBuilder("usuario")
        .leftJoinAndSelect("usuario.bodegas", "bodegas")
        .where("usuario.id = :ui", { ui })
        .andWhere("bodegas.estatus=:edo", { edo: EstatusEstado.ACTIVO })
        .getOne();
      res.json(usuarioBodegas.bodegas)
    } catch (error) {
      next(error);
    }
  }

  static obtenerProyectos = async (req: Request, res: Response,next:NextFunction) => {
    let { ui } = res.locals.jwtPayload;
    try {
      const usuarioProyectos = await AppDataSource.getRepository(Usuario)
        .createQueryBuilder("usuario")
        .leftJoinAndSelect("usuario.proyectos", "proyectos")
        .where("usuario.id = :ui", { ui })
        .andWhere("proyectos.estatus=:edo", { edo: EstatusEstado.ACTIVO })
        .getOne();
      res.json(usuarioProyectos.proyectos)
    } catch (error) {
      next(error);
    }
  }


  //Nuevo usuario. solo los datos generales:nombre, correo, vencimiento, estatus, rol , foto.
  //areas,bodegas, proyectos
  static nuevo = async (req: Request, res: Response,next:NextFunction) => {
    const { 
      rolesIds, 
      proyectosIds, 
      bodegasIds, 
      areasIds, 
      vencimiento, 
      ...body } = req.body;
    try {
      const usuario = new Usuario();
      const password:string=passGenerator.generarPassword();
      usuario.vencimiento = new Date(vencimiento);
      usuario.password = password;
      usuario.hashPassword();
      usuario.roles = await AppDataSource.getRepository(Rol).findBy({ id: In(rolesIds) });
      usuario.proyectos = await AppDataSource.getRepository(Proyecto).findBy({ id: In(proyectosIds) });
      usuario.bodegas = await AppDataSource.getRepository(Bodega).findBy({ id: In(bodegasIds) });
      usuario.areas = await AppDataSource.getRepository(Area).findBy({ id: In(areasIds) });
  
      const usuarioCreado=await CommonController.nuevo(
        AppDataSource.getRepository(Usuario),
        usuario,
        body,
        res.locals.jwtPayload.si
      )
      res.json({
        nombre:usuarioCreado.nombre,
        vencimiento:usuarioCreado.vencimiento
      });
  
      EnviarMail.correoNuevoUsuario(body.correo,password);
      } catch (error) {
        next(error)
      }
  }

  //Edita usuario excepto el password... 
  //datos generales: nombre, correo, vencimiento, estatus, rol , foto.
  static editar = async (req: Request, res: Response,next:NextFunction) => {
    const { si } = res.locals.jwtPayload;
    const { 
      nombre,
      correo, 
      rolesIds, 
      vencimiento,
      id,
      proyectosIds, 
      bodegasIds, 
      areasIds } = req.body;
    try {
      const usuario:Usuario=await AppDataSource.getRepository(Usuario).findOneByOrFail({ id: idSeguro(id) });
      usuario.nombre= nombre;
      usuario.correo= correo;
      usuario.roles = await AppDataSource.getRepository(Rol).findBy({ id: In(rolesIds) });
      usuario.vencimiento = new Date(vencimiento);
      usuario.proyectos = await AppDataSource.getRepository(Proyecto).findBy({ id: In(proyectosIds) });
      usuario.bodegas = await AppDataSource.getRepository(Bodega).findBy({ id: In(bodegasIds) });
      usuario.areas = await AppDataSource.getRepository(Area).findBy({ id: In(areasIds) });
      usuario.sesionId = si;

      const error = await validate(usuario, OPCIONES_VALIDACION);
      if (error.length > 0) {
        const errorMap = error.map(obj=>obj.property);
        throw new AppError(`Error de validación en: ${errorMap.join(", ")}`,400);
      }
      await AppDataSource.getRepository(Usuario).save(usuario);
      res.json();
    } catch (error) {
      next(error)
    }
  }

  static cambiarPassword = async (req: Request, res: Response, next:NextFunction) => {
    //El usuario solo puede editar su propio perfil.
    let { pa,pn } = req.body;
    let { ui,si } = res.locals.jwtPayload;

    try {
      if(!passGenerator.esPasswordValido(pn)){
        throw new AppError("Nuevo password inválido",406);
      }
      const usuario = await AppDataSource.getRepository(Usuario).findOneOrFail({ 
        select: { id: true, nombre: true, correo: true, password: true, vencimiento: true, estatus: true }, 
        where: { id: ui } ,
      });

      if(!usuario.checkIfUnencryptedPasswordIsValid(pa)){
        throw new AppError("El password enviado como actual no coincide con el almacenado en la BD",403);
      }
      usuario.sesionId=si;
      usuario.password=pn;
      usuario.hashPassword();
      await AppDataSource.getRepository(Usuario).save(usuario)
      res.json();

    } catch (error) {
      next(error)
    }

  }

  // solo para administradores. La contraseña nueva se envía por correo; NUNCA en la respuesta (hallazgo C5).
  static regenerarPassword = async (req: Request, res: Response,next:NextFunction) => {
    const { email } = req.body;
    const { si } = res.locals.jwtPayload;
    try {
      if (typeof email !== "string" || email.length === 0) {
        throw new AppError("Correo requerido", 400);
      }
      const usuario = await AppDataSource.getRepository(Usuario).findOneOrFail({
        select: { id: true, nombre: true, correo: true, password: true, vencimiento: true, estatus: true },
        where: { correo: email },
      });
      const password = passGenerator.generarPassword();
      usuario.sesionId = si;
      usuario.password = password;
      usuario.hashPassword();
      await AppDataSource.getRepository(Usuario).save(usuario);
      EnviarMail.correoNuevoPassword(usuario.correo, password);
      res.json({ correo: usuario.correo, enviado: true });
    } catch (error) {
      next(error);
    }
  }

  // solo para administradores
  static habilitar = (req: Request, res: Response,next:NextFunction) =>{
    CommonController.habilitar(
      AppDataSource.getRepository(Usuario),
      parametro(req, "id"),
      res.locals.jwtPayload.si
    )
    .then( respuesta => {
      res.json(respuesta);
    } )
    .catch( error => next(error) )
  }

  static deshabilitar = (req: Request, res: Response,next:NextFunction) =>{
    CommonController.deshabilitar(
      AppDataSource.getRepository(Usuario),
      parametro(req, "id"),
      res.locals.jwtPayload.si
    )
    .then( respuesta => {
      res.json(respuesta);
    } )
    .catch( error => next(error) )
  }


  // AGREGAR COMENTARIO
  static agregarComentario = (req: Request, res: Response, next:NextFunction) =>{
    const {jwtPayload}=res.locals;
    const {id,comentario} = req.body;
    CommonController.agregarComentario(
      AppDataSource.getRepository(Usuario),
      id,
      jwtPayload.si,
      comentario
    )
    .then( respuesta => {
        res.json(respuesta);
    } )
    .catch( error => next(error))    
  }

  // QUITAR COMENTARIO
  static quitarComentario = (req: Request, res: Response, next:NextFunction) =>{
    const {jwtPayload}=res.locals;
    const {id,idComentario} = req.body;
    CommonController.quitarComentario(
      AppDataSource.getRepository(Usuario),
      id,
      jwtPayload.si,
      idComentario
    )
    .then( respuesta => {
        res.json(respuesta);
    } )
    .catch( error => next(error))    
  }

};

export default UsuarioController;