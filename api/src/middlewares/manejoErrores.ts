import { Request, Response, NextFunction } from "express";
import { register } from "ts-node";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { LogTipo } from "../entity/LogGeneral";
// import { getRepository } from "typeorm";

// import { LogTipo, LogGeneral } from "../entity/LogGeneral";
// import { isString, isObject } from "util";
// import { conexion } from "../conexionORM";
// import { isError } from "lodash";

declare function fnGeneralManejoErrores(req: Request, res: Response, next: NextFunction): any;

declare function fnGeneralManejoErroresPromise(req: Request, res: Response, next: NextFunction): Promise<any>;

const conManejoDeErroresPromise = fnGeneralManejoErroresPromise =>( 
  (req: Request, res: Response, next: NextFunction) => 
    fnGeneralManejoErroresPromise(req,res,next)
    .then((val)=>{
      if(val!==undefined){
        console.log("conManejoDeErroresPromise->",val)
      }
    })
    .catch(error=>next(error))
)


const conManejoDeErrores = fnGeneralManejoErrores => {
    return (req: Request, res: Response, next: NextFunction) => {
      try{
        fnGeneralManejoErrores(req, res, next);
      }
      catch(error){
        next(error)
      }
    };
  };

const errorCodes= (code:string):string=>{
  switch(code){
    case 'ER_DUP_ENTRY': return "Registro duplicado, por favor reintenta con nuevos valores"
    default: return code;
  }
}

const errorMiddlewere = (err:any, req: Request, res: any, next: NextFunction) => {    
    console.log("******* ERROR MIDDLEWERE --- : ", err.message)
    // console.log("DETALLE ERROR :", err)
    const {path,body,params,headers,ip}=req;
    // console.log("DETALLE REQ :", { path,body,params,headers,ip })
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'Error';
    
    // jwt must be provided
    
    LogGeneralController.InsertarLog(LogTipo.ERROR,err.message,{
      path,body,params,headers,ip,
      errorMessage:`${err.message}-${res.sentry?`Sentry${res.sentry}`:''}`});
    
    switch(err.name){
      case 'JsonWebTokenError':
        err.status = "499";
        break;
      case 'EntityNotFound':
        err.message="REGISTRO NO ENCONTRADO"

    }

    if(err.code!==undefined){
      err.message=errorCodes(err.code);
    }

    const {message,status}=err;

    res.status(err.statusCode)
    .json({
      code: status,
      message: message,
    });
}
    

export {errorMiddlewere}; 