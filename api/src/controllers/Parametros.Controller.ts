import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";
import { Parametros } from "../entity/Parametros";
import CommonController from "./common/Common.Controller";


class ParametrosController{
    static listaSimpleInterna = (req: Request, res: Response,next:NextFunction) =>{
        CommonController.listaSimple(
            getRepository(Parametros),
            ["id","llave","valor"]
        )
        .then(lista => {
            res.json(lista);
        })
        .catch(error => next(error));
    };

    static editar = (req: Request, res: Response,next:NextFunction) => {
        const {jwtPayload}=res.locals;
        CommonController.editar(
            getRepository(Parametros) ,
            req.body,
            jwtPayload.si 
        )
        .then( respuesta => {
            res.json(respuesta);
        } )
        .catch( error =>next(error))
    }
}
export default ParametrosController;