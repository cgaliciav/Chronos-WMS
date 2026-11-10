import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Bodega } from "../entity/Bodega";
import CommonController from "./common/Common.Controller";
import { construirFiltros } from "../helpers/filtrosTabla";
import { parametro } from "../helpers/ids";

// Filtros de las tablas antd, parametrizados (antes se interpolaban llaves y valores: hallazgo C1).
const condicionesWhereAnd = (filters: any) => construirFiltros(filters, { alias: "bodega" });

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
        const id = parametro(req, "id");
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
        const id = parametro(req, "id");
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
        const id = parametro(req, "id");
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