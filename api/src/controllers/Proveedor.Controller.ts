import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Proveedor } from "../entity/Proveedor";
import CommonController from "./common/Common.Controller";
import { construirFiltros } from "../helpers/filtrosTabla";
import { logger } from "../helpers/logger";


// Filtros de las tablas antd, parametrizados (antes se interpolaban llaves y valores: hallazgo C1).
const condicionesWhereAnd = (filters: any) => construirFiltros(filters, { alias: "proveedor" });

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
        logger.info("******* LISTA TABLA PROVEEDORES BODY",req.body)
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