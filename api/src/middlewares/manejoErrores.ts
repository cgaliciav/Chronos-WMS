import { Request, Response, NextFunction } from "express";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { LogTipo } from "../entity/LogGeneral";
import { AppError } from "../helpers/errorClases";
import { logger } from "../helpers/logger";

const errorCodes= (code:string):string=>{
  switch(code){
    case 'ER_DUP_ENTRY': return "Registro duplicado, por favor reintenta con nuevos valores"
    default: return code;
  }
}

const errorMiddlewere = (err:any, req: Request, res: any, next: NextFunction) => {    
    logger.warn("Error en la petición:", req.method, req.originalUrl, err.message)
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
      case 'TokenExpiredError':
        err.statusCode = 401;
        err.status = "Sin autorización";
        break;
      case 'EntityNotFound':
      case 'EntityNotFoundError':
        err.statusCode = 404;
        err.status = "Recurso no encontrado";
        err.message="REGISTRO NO ENCONTRADO";
        break;
    }

    if(err.code!==undefined){
      err.message=errorCodes(err.code);
    }

    const {message,status}=err;

    res.status(err.statusCode)
    .json({
      ...(err instanceof AppError && err.detalle ? err.detalle : {}),
      code: status,
      message: message,
    });
}
    

export {errorMiddlewere}; 