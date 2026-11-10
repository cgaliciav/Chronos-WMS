import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Proyecto } from "../entity/Proyecto";
import CommonController from "./common/Common.Controller";
import { construirFiltros } from "../helpers/filtrosTabla";
import { parametro } from "../helpers/ids";

const listaSimple = async()=>(
    await CommonController.listaSimple(
        getRepository(Proyecto),
        ["id","nombre","esExterno"]
    )
);

// Filtros de las tablas antd, parametrizados (antes se interpolaban llaves y valores: hallazgo C1).
const condicionesWhereAnd = (filters: any) => construirFiltros(filters, { alias: "proyecto" });

class ProyectoController{

    static listaSimpleExterna = (req: Request, res: Response,next:NextFunction) =>{
        listaSimple()
        .then(lista => {
            res.json(lista.filter(item=>item.esExterno));
        })
        .catch(error => next(error));
    };

    static listaSimpleInterna = (req: Request, res: Response,next:NextFunction) =>{
        listaSimple()
        .then(lista => {
            res.json(lista.filter(item=>!item.esExterno));
        })
        .catch(error => next(error));
    };

    static listaSimple = (req: Request, res: Response,next:NextFunction) =>{
        listaSimple()
        .then(lista => {
            res.json(lista);
        })
        .catch(error => next(error));
    };

//TABLA SEGUN LO REQUIEREN LAS TABLAS DE ANTD
    static listaTabla = async (req: Request, res: Response,next:NextFunction) =>{
        CommonController.listaTabla(
            getRepository(Proyecto),
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
            getRepository(Proyecto), 
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
        getRepository( Proyecto ),
        new Proyecto(),
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
            getRepository(Proyecto) ,
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
            getRepository(Proyecto),
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
            getRepository(Proyecto),
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
            getRepository(Proyecto),
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
            getRepository(Proyecto),
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

export default ProyectoController;