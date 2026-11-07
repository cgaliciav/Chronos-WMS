import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Bodega } from "../entity/Bodega";
import CommonController from "./common/Common.Controller";

const condicionesWhereAnd=(filters:any)=>{
    const condicionesWhere:string[]=[];
    for (const key in filters) {
    if(filters[key]===null || filters[key]===undefined)
        continue;
      if(key.indexOf("nombre")>=0||key.indexOf("correo")>=0){
        condicionesWhere.push(`bodega.${key} LIKE '%${filters[key].pop()}%'`)
      } else {
        // condicionesWhere.push(`bodega.${key} IN (${filters[key].join(",")})`)
        condicionesWhere.push(`bodega.${key} IN (${filters[key].map(it=>`'${it}'`).join(",")})`)
      }
    }
  
    if(condicionesWhere.length>0){
      return condicionesWhere.join(' AND ');
    } else {
      return "";
    }
  
  }

class BodegaController{

    static listaSimple = (req: Request, res: Response,next:NextFunction) =>{
        CommonController.listaSimple(
            getRepository(Bodega),
            ["id","nombre"]
        )
        .then(lista => {
            res.json(lista);
        })
        .catch(error => next(error));
    };

    //TABLA SEGUN LO REQUIEREN LAS TABLAS DE ANTD
    static listaTabla = async (req: Request, res: Response,next:NextFunction) =>{
        CommonController.listaTabla(
            getRepository(Bodega),
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
            getRepository(Bodega), 
            [], 
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
            getRepository( Bodega ),
            new Bodega(),
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
            getRepository(Bodega) ,
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
            getRepository(Bodega),
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
            getRepository(Bodega),
            id,
            jwtPayload.si 
        )
        .then( respuesta => {
            res.json(respuesta);
        } )
        .catch( error => next(error))
    }

};

export default BodegaController;