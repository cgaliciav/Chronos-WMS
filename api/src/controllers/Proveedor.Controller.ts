import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Proveedor } from "../entity/Proveedor";
import CommonController from "./common/Common.Controller";


const condicionesWhereAnd=(filters:any)=>{
    const condicionesWhere:string[]=[];
    console.log("******filters ",filters)
    for (const key in filters) {
        if(filters[key]===null || filters[key]===undefined)
            continue;
        if(key.indexOf("nombre")>=0||key.indexOf("correo")>=0){
            condicionesWhere.push(`proveedor.${key} LIKE '%${filters[key].pop()}%'`)
        } else {
            condicionesWhere.push(`proveedor.${key} IN (${filters[key].map(it=>`'${it}'`).join(",")})`)
        }
    }
  
    if(condicionesWhere.length>0){
        return condicionesWhere.join(' AND ');
    } else {
        return "";
    }
  
};

class ProveedorController{
    static listaSimple = async (req: Request, res: Response,next:NextFunction) =>{
        try {
          res.json(await CommonController.listaSimpleGenerica(
            getRepository(Proveedor),
            ["id","nombre"]
          )); 
        } catch (error) {
          next(error)
        }
    };

    static listaSimpleCompletaDinamica = async (req: Request, res: Response, next: NextFunction) => {
        const {busqueda}= req.body;
        try {
            const resp=await CommonController.BusquedaListaSimpleCompleta(
                getRepository(Proveedor),
                ["id","nombre"],
                busqueda);
            // console.log("ProveedorController->listaSimpleCompletaDinamica<<<<<<<<<<<<<",resp)
            res.json(resp);
        } catch (error) { 
          next (error);
        }
    };


  //TABLA SEGUN LO REQUIEREN LAS TABLAS DE ANTD
    static listaTabla = async (req: Request, res: Response, next: NextFunction) =>{
        console.log("******* LISTA TABLA PROVEEDORES BODY",req.body)
        CommonController.listaTabla(
            getRepository(Proveedor),
            req.body,
            condicionesWhereAnd,
        )
        .then( respuesta => {
            res.json(respuesta);
        } )
        .catch( error => next(error))
    };


    static obtenerId = (req: Request, res: Response,next:NextFunction) =>{
        const {id} = req.params;
        CommonController.obtenerId( 
            getRepository(Proveedor), 
            ["comentarios"], 
            id,
        )
        .then(registro =>{
            res.json(registro);
        })
        .catch(error => next(error));
    }

    static nuevo = async (req: Request, res: Response,next:NextFunction) => {
        const {jwtPayload}=res.locals;
        CommonController.nuevo( 
            getRepository( Proveedor ),
            new Proveedor(),
            req.body,
            jwtPayload.si 
        )
        .then( respuesta => {
            res.json(respuesta);
        } )
        .catch( error => next(error) )
    }

    static editar = (req: Request, res: Response,next:NextFunction) => {
        const {jwtPayload}=res.locals;
        CommonController.editar(
            getRepository(Proveedor) ,
            req.body,
            jwtPayload.si 
        )
        .then( respuesta => {
            res.json(respuesta);
        } )
        .catch( error =>next(error))
    }

    static habilitar = (req: Request, res: Response,next:NextFunction) =>{
        const {jwtPayload}=res.locals;
        const {id} = req.params;
        CommonController.habilitar(
            getRepository(Proveedor),
            id,
            jwtPayload.si 
        )
        .then( respuesta => {
            res.json(respuesta);
        })
        .catch( error => next(error) )
    }

    static deshabilitar = (req: Request, res: Response,next:NextFunction) =>{
        const {jwtPayload}=res.locals;
        const {id} = req.params;
        CommonController.deshabilitar(
            getRepository(Proveedor),
            id,
            jwtPayload.si 
        )
        .then( respuesta => {
            res.json({...respuesta});
        } )
        .catch( error => next(error))
    }

    static agregarComentario = (req: Request, res: Response,next:NextFunction) =>{
        const {jwtPayload}=res.locals;
        const {id,comentario} = req.body;
        CommonController.agregarComentario(
            getRepository(Proveedor),
            id,
            jwtPayload.si,
            comentario
        )
        .then( respuesta => {
            res.json(respuesta);
        } )
        .catch( error => next(error)) 

    }

    static quitarComentario = (req: Request, res: Response,next:NextFunction) =>{
        const {jwtPayload}=res.locals;
        const {id,idComentario} = req.body;
        CommonController.quitarComentario(
            getRepository(Proveedor),
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

export default ProveedorController;