import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Proveedor } from "../entity/Proveedor";
import CommonController from "./common/Common.Controller";
import { construirFiltros } from "../helpers/filtrosTabla";
import { logger } from "../helpers/logger";
import { parametro } from "../helpers/ids";


// Filtros de las tablas antd, parametrizados (antes se interpolaban llaves y valores: hallazgo C1).
const condicionesWhereAnd = (filters: any) => construirFiltros(filters, { alias: "proveedor" });

class ProveedorController{
    static listaSimple = async (req: Request, res: Response,next:NextFunction) =>{
        try {
          res.json(await CommonController.listaSimpleGenerica(
            AppDataSource.getRepository(Proveedor),
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
                AppDataSource.getRepository(Proveedor),
                ["id","nombre"],
                busqueda);
            res.json(resp);
        } catch (error) { 
          next (error);
        }
    };


  //TABLA SEGUN LO REQUIEREN LAS TABLAS DE ANTD
    static listaTabla = async (req: Request, res: Response, next: NextFunction) =>{
        logger.info("******* LISTA TABLA PROVEEDORES BODY",req.body)
        CommonController.listaTabla(
            AppDataSource.getRepository(Proveedor),
            req.body,
            condicionesWhereAnd,
        )
        .then( respuesta => {
            res.json(respuesta);
        } )
        .catch( error => next(error))
    };


    static obtenerId = (req: Request, res: Response,next:NextFunction) =>{
        const id = parametro(req, "id");
        CommonController.obtenerId( 
            AppDataSource.getRepository(Proveedor), 
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
            AppDataSource.getRepository( Proveedor ),
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
            AppDataSource.getRepository(Proveedor) ,
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
        const id = parametro(req, "id");
        CommonController.habilitar(
            AppDataSource.getRepository(Proveedor),
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
        const id = parametro(req, "id");
        CommonController.deshabilitar(
            AppDataSource.getRepository(Proveedor),
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
            AppDataSource.getRepository(Proveedor),
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
            AppDataSource.getRepository(Proveedor),
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