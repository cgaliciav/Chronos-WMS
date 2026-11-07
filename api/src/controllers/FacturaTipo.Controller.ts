import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { FacturaTipo } from "../entity/FacturaTipo";
import CommonController from "./common/Common.Controller";

class FacturaTipoController{

    static listaSimple = (req: Request, res: Response,next:NextFunction) =>{
        CommonController.listaSimple(
            getRepository(FacturaTipo),
            ["id","nombre"]
        )
        .then(lista => {
            res.json(lista);
        })
        .catch(error => next(error) );
    };

};

export default FacturaTipoController;