import { validate } from "class-validator";
import { FindManyOptions, getRepository, Like, Repository, SelectQueryBuilder } from "typeorm";
import { Archivo } from "../../entity/Archivo";
import { Area } from "../../entity/Area";
import { Bodega } from "../../entity/Bodega";
import { Comentario } from "../../entity/Comentario";
import { EstatusEstado } from "../../entity/common/NombreEstatus";
import { Grupo } from "../../entity/Grupo";
import { Proveedor } from "../../entity/Proveedor";
import { Proyecto } from "../../entity/Proyecto";
import { Rol } from "../../entity/Rol";
import { Sesion } from "../../entity/Sesion";
import { Usuario } from "../../entity/Usuario";
import { AppError } from "../../helpers/errorClases";
import ArchivoController from "../Archivo.Controller";

interface PaginacionANTD{
    current:number,
    pageSize:number,
    total:number, //total filtraado
    totalItems:number,
}
interface ResultadoTabla{
    results:(Usuario|Area|Bodega|Grupo|Proyecto|Proveedor|Rol|any)[],
    pagination:PaginacionANTD,
    filtered:number
}


export default class {
    static listaSimpleGenerica= async <T extends Usuario|Area|Bodega|Grupo|Proyecto|Proveedor|Rol> (repo:Repository<T>,campos:string[],estatus:EstatusEstado=EstatusEstado.ACTIVO):Promise<T[]> => {
        // let loco:T[];
        const options:FindManyOptions<T>={
            select:campos.map(c=>c as (keyof (T)))
          }
        const st:string = estatus;
        options.where={st};
        
          
        return await repo.find(options);
    }
    static BusquedaListaSimpleCompleta = async <T extends Usuario|Area|Bodega|Grupo|Proyecto|Proveedor|Rol> (repo:Repository<T>,camposSelect:string[],busqueda:string=""):Promise<T[]> => {

        const options:FindManyOptions<T>={
          select:camposSelect.map(cs=>cs as (keyof T))
        }
        if(busqueda.length>0)
          options.where={nombre:Like(`%${busqueda}%`)}
        
        // const repo:Repository<T> = getRepository(T);
      
        return await repo.find( options )
      }

    static listaSimple=(repo:Repository<any>,campos:string[],estatus:EstatusEstado=EstatusEstado.ACTIVO)=>
        new Promise<any[]>( ( resolve, reject )  => {
            // (typeof repo) as type;
            repo.find({
                select:campos,
                where:{estatus},
                order:{id:"DESC"}
              })
            .then( respuesta => {
                resolve( respuesta )
            })
            .catch(err => {
                // console.error( err );
                // LogGeneralController.InsertarLog(LogTipo.ERROR,"CommonController.listaSimple",err);
                // reject( new Error("Error al intentar obtener el listado. Si el problema persiste consulte a su administrador") )
                reject(err)
            } )
        } )
        
        // page, results, sortField, sortOrder
    static listaTabla= async(repo:Repository<any>,{sortField, sortOrder, pagination, filters},fnFiltrado:(filters:any)=>string) =>
        new Promise<ResultadoTabla>( async ( resolve, reject) =>{
            const campoOrden:string=sortField?sortField:"id";
            let direccion:string='DESC';
            const page = (pagination.current===undefined?1:pagination.current);
            const {pageSize} = pagination;                
            const starts = pageSize*page - pageSize;

            if(sortOrder !== undefined){ 
                direccion=(sortOrder=='descend')?"DESC":"ASC";
            }

            try {
                const parametrosFind = {skip:starts,
                    take:pageSize,
                    order:{},
                    where:fnFiltrado(filters)
                };
    
                parametrosFind.order[campoOrden]=direccion;
                
                const results=await repo.find( parametrosFind );
                const filtered=await repo.count( parametrosFind );
                const respuesta:ResultadoTabla={
                    results,
                    // filtered:results.length,
                    filtered,
                    pagination:{
                        current:page,
                        pageSize,
                        total:filtered,
                        totalItems:await repo.count()
                    }
                }
                resolve(respuesta)
            } catch (error) {
                reject(error)
            }
          } );

    static listaTablaQry = async ({sortField, sortOrder, pagination, filters},fnQuery:()=>SelectQueryBuilder<any> ,fnFiltrado:(filters:any)=>string) => {
        const campoOrden:string=sortField?sortField:"id";
        let direccion:string='ASC';
        const page = (pagination.current===undefined?1:pagination.current);
        const {pageSize} = pagination;                
        const starts = pageSize*page - pageSize;

        if(sortOrder !== undefined){ 
            direccion=(sortOrder=='descend')?"DESC":"ASC";
        }

        const qry=fnQuery();
        const conteoTotal= await qry.getCount();

        const condicionesWhere = fnFiltrado(filters);
        if(condicionesWhere.length>0){
            console.log("listaTablaQry-------------------",condicionesWhere);
            qry.where(condicionesWhere)
        }
        const conteoFiltrado = await qry.getCount();

        qry.orderBy(campoOrden,direccion as ("ASC"|"DESC"));
        qry.skip(starts).take(pageSize);
        const qryResult = await qry.getMany();

        const respuesta:ResultadoTabla={
            results:qryResult,
            filtered:conteoFiltrado,
            pagination:{
                current:page,
                pageSize,
                //   total: conteoTotal
                total:conteoFiltrado,
                totalItems:conteoTotal,
            }
    
          }
        return respuesta;
    }

    static listaTablaQryAnd = async ({sortField, sortOrder, pagination, filters},fnQuery:()=>SelectQueryBuilder<any> ,fnFiltrado:(filters:any)=>string) => {
        const campoOrden:string|string[]=sortField?sortField:"id";
        let direccion:string='ASC';
        const page = (pagination.current===undefined?1:pagination.current);
        const {pageSize} = pagination;                
        const starts = pageSize*page - pageSize;

        if(sortOrder !== undefined){ 
            direccion=(sortOrder=='descend')?"DESC":"ASC";
        }

        const qry=fnQuery();
        const conteoTotal= await qry.getCount();

        const condicionesWhere = fnFiltrado(filters);
        if(condicionesWhere.length>0){
            console.log("listaTablaQry-------------------",condicionesWhere);
            qry.andWhere(condicionesWhere)
        }
        const conteoFiltrado = await qry.getCount();

        console.log("listaTablaORDER-------------------",campoOrden);
        if(!Array.isArray(campoOrden)){
            qry.orderBy(campoOrden,direccion as ("ASC"|"DESC"));
        } else {
            console.log("listaTablaORDER------------->>>>",campoOrden.slice(campoOrden.length-2).join('.'));
            qry.orderBy(campoOrden.slice(campoOrden.length-2).join('.'),direccion as ("ASC"|"DESC"));
        }
        qry.skip(starts).take(pageSize);
        const qryResult = await qry.getMany();

        const respuesta:ResultadoTabla={
            results:qryResult,
            filtered:conteoFiltrado,
            pagination:{
                current:page,
                pageSize,
                //   total: conteoTotal
                total:conteoFiltrado,
                totalItems:conteoTotal,
            }
    
          }
        return respuesta;
    }

    static obtenerIdQuery = (fnQuery:SelectQueryBuilder<any>) =>
        new Promise<any>( ( resolve, reject)  => {
            fnQuery
            .getOne()
            .then(respuesta => {
                resolve( respuesta )
            })
            .catch(err => {
                reject(err)
            })
        } )

    static obtenerId = (repo:Repository<any>,relaciones:string[],id:number|string) =>
        new Promise<any>( ( resolve, reject)  => {
            console.log("obtenerId llamado>>>>>>>>>", repo.target);
            repo.findOneOrFail(id,{ 
                relations: relaciones, 
                loadEagerRelations:false,
            })
            .then(respuesta => {
                console.log("obtenerId resolve>>>>>>>>>",repo.target);
                resolve( respuesta )
            })
            .catch(err => {
                console.log("obtenerId catch>>>>>>>>>", repo.target);
                reject(err)
            })
        } )        
    
    static nuevo=(repo:Repository<any>,registro:any,body:any,sesionId:number) =>
        new Promise<any>( async ( resolve, reject ) =>{
            try {
                registro.sesionId = sesionId;
                for (const key in body) {
                    registro[key] = body[key];
                }
                const error = await validate(registro);
                if (error.length > 0) {
                    let errorMap = error.map(obj=>obj.property);
                    reject(new AppError(`Error de validación en: ${errorMap.join(", ")}` ));
                    return;
                } 
                
                await repo.save(registro)
                resolve(registro)
            } catch (error) {
                reject(error)
            }
        } );

    static editar=(repo:Repository<any>, body:any, sesionId:number) =>
        new Promise<any>( async ( resolve, reject ) =>{
            try{
                let registro = await repo.findOneOrFail(body.id);
                registro.sesionId = sesionId;
                for (const key in body) {
                    if(key != 'id'){
                        registro[key] = body[key];
                    }
                }
                const error = await validate(registro);
                if (error.length > 0) {
                    let errorMap = error.map(obj=>obj.property);
                    reject(new AppError(`Error de validación en: ${errorMap.join(", ")}` ,400));
                    return;
                } 
                
                await repo.save(registro);
                resolve(registro);
            }
            catch(error){
                reject(error)
            }

    } );
    
    static editarConRegistro=(repo:Repository<any>, registro:any, body:any, sesionId:number) =>
        new Promise<any>( async ( resolve, reject ) =>{
            try{
                registro.sesionId = sesionId;
                for (const key in body) {
                    if(key != 'id'){
                        registro[key] = body[key];
                    }
                }
                const error = await validate(registro);
                if (error.length > 0) {
                    let errorMap = error.map(obj=>obj.property);
                    reject(new AppError(`Error de validación en: ${errorMap.join(", ")}` ,400));
                    return;
                } 
                
                await repo.save(registro);
                resolve(registro);
            }
            catch(error){
                reject(error);
            }

    } );

    static habilitar=( repo: Repository<any>, id: number|string, sesionId:number ) =>
        new Promise<any>( ( resolve, reject ) =>{
            repo.findOneOrFail({ where: { id } })
            .then(registro => {
                registro.estatus = EstatusEstado.ACTIVO;
                registro.sesionId = sesionId; 
                return repo.save(registro)
            })
            .then((reg)=>{
                resolve( { estatus: reg.estatus} )
            })
            .catch(erro=>{
                reject(erro)
            });        
        } );
    
    static deshabilitar = ( repo: Repository<any>, id: number|string, sesionId:number ) =>
        new Promise<any>( ( resolve, reject ) =>{
            repo.findOneOrFail({ where: { id } })
            .then(registro => {
                registro.estatus = EstatusEstado.INACTIVO;
                registro.sesionId = sesionId; 
                return repo.save( registro ) 
            })
            .then((reg)=>{
                resolve( { estatus: reg.estatus} )
            })
            .catch(erro=>{
                reject(erro)
            });        
        } );
    
    static finalizar = ( repo: Repository<any>, id: number|string, sesionId:number ) =>
        new Promise<any>( async ( resolve, reject ) =>{
            repo.findOneOrFail({ where: { id } })
            .then(registro => {
                registro.estatus = EstatusEstado.FINALIZADO;
                registro.sesionId = sesionId; 
                return repo.save( registro ) 
            })
            .then((reg)=>{
                resolve( { estatus: reg.estatus} )
            })
            .catch(erro=>{
                reject(erro)
            });        
        } );
    
    static eliminadoLogico = ( repo: Repository<any>, id: number|string, sesionId:number ) =>
        new Promise<any>( async ( resolve, reject ) =>{
            repo.findOneOrFail({ where: { id } })
            .then(registro => {
                registro.estatus = EstatusEstado.ELIMINADO;
                registro.sesionId = sesionId; 
                return repo.save( registro ) 
            })
            .then((reg)=>{
                resolve( { estatus: reg.estatus} )
            })
            .catch(erro=>{
                reject(erro)
            });        
        } );
    
    static agregarComentario = ( repo: Repository<any>, idRepo: number|string, sesionId:number, comentario:string ) =>
        new Promise<any> ( ( resolve, reject) => {
            getRepository(Sesion)
            .findOneOrFail(sesionId)
            .then(sesion =>{
                let comen = new Comentario;
                comen.comentario = comentario;
                comen.sesion = sesion;
                comen.sesionId = sesionId;
                return Promise.all([
                    repo.findOneOrFail(idRepo,{relations:["comentarios"]}),
                    getRepository(Comentario).save(comen)
                ])
            })
            .then(([registro,commet])=>{
                registro.sesionId = sesionId;
                registro.comentarios.push(commet);
                return repo.save(registro);
            })
            .then(registroGuardado=>repo
                .createQueryBuilder("repo")
                .leftJoinAndSelect("repo.comentarios","comentarios")
                .leftJoinAndSelect("comentarios.sesion","comentariosSesion")
                .leftJoinAndSelect("comentariosSesion.usuario","comentariosSesionUsuario")
                .where("repo.id=:id",{id:registroGuardado.id})
                .getOne()
            )
            .then(repoComentarios=>{
                resolve(repoComentarios);
            })
            .catch(error=>{
                reject(error)
            });    
        } )


    static quitarComentario = ( repo: Repository<any>, idRepo: number|string, sesionId:number, idComen: number|string ) =>
        new Promise<any> ( ( resolve, reject) => {
            
            repo.findOneOrFail(idRepo,{relations:["comentarios"]})
                .then(registro=>{
                    // let comentario = new Comentario;
                    registro.sesionId = sesionId ;
                    registro.comentarios = registro.comentarios.filter(comenta => {
                        comenta.sesionId = sesionId;
                        return comenta.id != idComen
                    })
                    return repo.save(registro)
                })
                .then((registroGuardado)=>repo
                    .createQueryBuilder("repo")
                    .leftJoinAndSelect("repo.comentarios","comentarios")
                    .leftJoinAndSelect("comentarios.sesion","comentariosSesion")
                    .leftJoinAndSelect("comentariosSesion.usuario","comentariosSesionUsuario")
                    .where("repo.id=:id",{id:registroGuardado.id})
                    .getOne()
                )
                .then(async repoComentarios=>{
                    let com= await getRepository(Comentario).findOne(idComen);
                    if(com!==undefined){
                        getRepository(Comentario).remove(com);
                    }
                    resolve(repoComentarios);
                })
                .catch(erro=>{
                    reject(erro)
                });        
            } )


    static agregarArchivo = async (repo: Repository<any>, idRepo: number|string, sesionId:number, file:any ) =>{
        const repoItem=await repo.findOneOrFail(idRepo,{relations:["archivos"]});
        repoItem.sesionId=sesionId;
        const archivoResultado=await ArchivoController.guardar(file,sesionId);

        repoItem.archivos.push(archivoResultado.archivo);
        await repo.save(repoItem);

        return (archivoResultado.rf)
    }
    
    static quitarArchivo = async (repo: Repository<any>, idRepo: number|string, sesionId:number, fileId:number|string ) =>{
        const repoItem=await repo.findOneOrFail(idRepo,{relations:["archivos"]});
        repoItem.sesionId=sesionId;
        repoItem.archivos = repoItem.archivos.filter(arch=>arch.id!==fileId);
        
        await ArchivoController.quitar(
            await getRepository(Archivo).findOneOrFail(fileId),
            sesionId);
        await repo.save(repoItem);
    }


}

export { PaginacionANTD, ResultadoTabla };
