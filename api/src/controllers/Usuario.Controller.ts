import { validate } from "class-validator";
import { NextFunction, Request, Response } from "express";
import { filter } from "lodash";
import { getRepository } from "typeorm";
import { Area } from "../entity/Area";
import { Bodega } from "../entity/Bodega";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { LogTipo } from "../entity/LogGeneral";
import { Proyecto } from "../entity/Proyecto";
import { Rol } from "../entity/Rol";
import { Usuario } from "../entity/Usuario";
import EnviarMail from "../helpers/enviarMail";
import { AppError } from "../helpers/errorClases";
import passGenerator from "../helpers/passGenerator";
import CommonController, { ResultadoTabla } from "./common/Common.Controller";
import LogGeneralController from "./LogGeneral.Controller";



// const BusquedaListaSimpleCompleta = async (camposSelect:string[],busqueda:string="")=>{

//   const options:FindManyOptions<Usuario>={
//     select:camposSelect.map(cs=>cs as (keyof Usuario))
//   }

//   if(busqueda.length>0)
//     options.where={nombre:Like(`%${busqueda}%`)}

//   return getRepository(Usuario).find({
//     select:["id","nombre"],
//     where:{nombre:Like(`%${busqueda}%`) }
//   })
// }

const condicionesWhereAnd=(filters:any)=>{
  const condicionesWhere:string[]=[];
  for (const key in filters) {
    if(filters[key]===null || filters[key]===undefined)
      continue;
    if(key.indexOf("nombre")>=0||key.indexOf("correo")>=0){
      condicionesWhere.push(`usuario.${key} LIKE '%${filters[key].pop()}%'`)
    } else if(key.indexOf("vencimiento")>=0){
      condicionesWhere.push(`(usuario.${key} BETWEEN ${filters[key][0]} AND ${filters[key][1]})`)
    } else if(key.indexOf("estatusExtendido")>=0){
      // condicionesWhere.push(`${key} IN (${filters[key].join(",")})`)
      condicionesWhere.push(`(if(usuario.estatus="inactivo","inactivo",if(usuario.vencimiento <= current_timestamp() ,"vencido","activo"))) IN (${filters[key].map(it=>`'${it}'`).join(",")})`)
    } else {
      // condicionesWhere.push(`usuario.${key} IN (${filters[key].join(",")})`)
      condicionesWhere.push(`usuario.${key} IN (${filters[key].map(it=>`'${it}'`).join(",")})`)
      
    }
  }

  if(condicionesWhere.length>0){
    return condicionesWhere.join(' AND ');
  } else {
    return "";
  }

}

class UsuarioController{

  static listaSimple = async (req: Request, res: Response,next:NextFunction) =>{
    try {
      res.json(await CommonController.listaSimpleGenerica(
        getRepository(Usuario),
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
        getRepository(Usuario),
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
        getRepository(Usuario),
        ["id","nombre"]) 
        );
    }catch(error){
      next(error);
    }
  }

//TABLA SEGUN LO REQUIEREN LAS TABLAS DE ANTD
  static listaTabla = async (req: Request, res: Response,next:NextFunction) =>{
    try {
      console.error("BODY",req.body);

      const {sortField, sortOrder, pagination, filters} = req.body;
      const campoOrden:string=sortField?sortField:"usuario.id";
      let direccionOrden:string='ASC';
      const page = (pagination.current===undefined?1:pagination.current);
      const {pageSize} = pagination;                
      let starts = pageSize*page - pageSize;
      console.log("page",page);
  
      if(sortOrder !== undefined) {
        direccionOrden=(sortOrder=='descend')?"DESC":"ASC"
      }

      // console.error("OTROS",{campoOrden,direccionOrden,starts})
      // console.log('*************** FILTERS',filters);
  
      const queryVencimiento = getRepository(Usuario)
      .createQueryBuilder("usuario")
      // .select(["usuario.id","usuario.nombre","usuario.correo","usuario.vencimiento","usuario.estatus"])
      .select(["usuario.id"])
      .addSelect('if(usuario.estatus="inactivo","inactivo",if(usuario.vencimiento <= current_timestamp() ,"vencido","activo"))',"estatusExtendido")
      
      const condicionesWhere = condicionesWhereAnd(filters);
      if(condicionesWhere.length>0){
        queryVencimiento.where(condicionesWhere)
      }
      // console.log("***********************************",queryVencimiento.getSql(),queryVencimiento.getParameters());
      console.log("page",page);

      const filtered= await queryVencimiento.getCount();
      const queryVencimientoResult = await queryVencimiento.orderBy(campoOrden,direccionOrden as ("ASC"|"DESC"))
        .skip(starts)
        .take(pageSize)
        .getRawMany();

        console.log("page",page);
        

      // console.error("queryVencimientoResult",queryVencimientoResult);

      const queryResult = await getRepository(Usuario)
        .findByIds(
          queryVencimientoResult.map(qvr=>qvr.usuario_id),
          {relations:["roles","areas","bodegas","proyectos"],}
        ); 

      // Se regresa el objeto con la estructura de Usuario agregando de 'estatusExtendido'
      const respuesta:ResultadoTabla={
        results:queryVencimientoResult.map(qv=>({
          ...queryResult.filter(qr=>qr.id===qv.usuario_id).pop(),
          estatusExtendido: qv.estatusExtendido,
          })),
        // filtered:queryVencimientoResult.length,
        filtered:await getRepository(Usuario).count(),
        // totales:await getRepository(Usuario).count(),
        pagination:{
          current:page,
          pageSize,
          // total: await getRepository(Usuario).count()
          total:filtered,
          totalItems:await getRepository(Usuario).count()
        }

      } 
      console.log("respuesta.pagination**************",respuesta.pagination)
      
      res.json( respuesta )

    } catch (error) {
        next(error);
    }

  }

  //Obtener datos generales y los roles del usuario que hace la peticion
  static actual = (req: Request, res: Response, next:NextFunction) =>{
    const {jwtPayload}=res.locals;
    console.log(`actual>>>>> ${jwtPayload.u}`);
    CommonController.obtenerId(
      getRepository(Usuario),
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
    const {id} = req.params;
    CommonController.obtenerId(
      getRepository(Usuario),
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
      const usuarioAreas = await getRepository(Usuario)
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
      const usuarioBodegas = await getRepository(Usuario)
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
      const usuarioProyectos = await getRepository(Usuario)
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
      usuario.roles = await getRepository(Rol).findByIds(rolesIds);
      usuario.proyectos = await getRepository(Proyecto).findByIds(proyectosIds);
      usuario.bodegas = await getRepository(Bodega).findByIds(bodegasIds);
      usuario.areas = await getRepository(Area).findByIds(areasIds);
  
      const usuarioCreado=await CommonController.nuevo(
        getRepository(Usuario),
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
      const usuario:Usuario=await getRepository(Usuario).findOneOrFail(id,);
      usuario.nombre= nombre;
      usuario.correo= correo;
      usuario.roles = await getRepository(Rol).findByIds(rolesIds);
      usuario.vencimiento = new Date(vencimiento);
      usuario.proyectos = await getRepository(Proyecto).findByIds(proyectosIds);
      usuario.bodegas = await getRepository(Bodega).findByIds(bodegasIds);
      usuario.areas = await getRepository(Area).findByIds(areasIds);
      usuario.sesionId = si;

      const error = await validate(usuario);
      if (error.length > 0) {
        const errorMap = error.map(obj=>obj.property);
        throw new AppError(`Error de validación en: ${errorMap.join(", ")}`,400);
      }
      getRepository(Usuario).save(usuario);
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
      const usuario = await getRepository(Usuario).findOneOrFail({ 
        select: ["id", "nombre", "correo", "password", "vencimiento", "estatus"], 
        where: { id: ui } ,
      });

      if(!usuario.checkIfUnencryptedPasswordIsValid(pa)){
        // console.error(new Error("El password enviado como actual no coincide con el almacenado en la BD"));      
        // LogGeneralController.InsertarLog(LogTipo.ERROR,"UsuarioController.cambiarPassword El password enviado como actual no coincide con el almacenado en la BD");
        throw new AppError("El password enviado como actual no coincide con el almacenado en la BD",403);
      }
      usuario.sesionId=si;
      usuario.password=pn;
      usuario.hashPassword();
      await getRepository(Usuario).save(usuario)
      res.json();

    } catch (error) {
      next(error)
    }

  }

  // solo para administradores
  static regenerarPassword = (req: Request, res: Response,next:NextFunction) => {
    let { email } = req.body;

    let { si } = res.locals.jwtPayload;

    let password = passGenerator.generarPassword();
    getRepository(Usuario)
      .findOneOrFail({
        select: ["id", "nombre", "correo", "password", "vencimiento", "estatus"], 
        where:{correo: email },
      } )
      .then(usuario =>{
        usuario.sesionId=si;
        
        usuario.password=password;
        usuario.hashPassword();
        return getRepository(Usuario).save(usuario)
      })
      .then(usuario=>{
        // EnviarMail.correoNuevoPassword(usuario.correo,password);
        res.json({ c: password} );
      })
      .catch(error => next(error));
  }

  // solo para administradores
  static habilitar = (req: Request, res: Response,next:NextFunction) =>{
    CommonController.habilitar(
      getRepository(Usuario),
      req.params.id,
      res.locals.jwtPayload.si
    )
    .then( respuesta => {
      res.json(respuesta);
    } )
    .catch( error => next(error) )
  }

  static deshabilitar = (req: Request, res: Response,next:NextFunction) =>{
    CommonController.deshabilitar(
      getRepository(Usuario),
      req.params.id,
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
      getRepository(Usuario),
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
      getRepository(Usuario),
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