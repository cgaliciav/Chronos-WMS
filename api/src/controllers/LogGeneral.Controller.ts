import { getRepository } from "typeorm";
import { LogGeneral, LogTipo } from "../entity/LogGeneral";
import { logger } from "../helpers/logger";

export default class LogGeneralController{
// INSERCIÓN Y LISTADOD DE LOGS DEL PROGRAMA

    static InsertarLog = (tipo:LogTipo,mensaje:string,data?:any|undefined) =>{
        let log = new LogGeneral();
        log.mensaje=mensaje.substring(0,255);
        log.tipo=tipo;
        if(data === undefined)
            log.data="-";
        else if(typeof data === 'string')
            log.data=data;
        else if(data instanceof Error)
            log.data=data.message;
        else 
            log.data=JSON.stringify(data);
        
        getRepository(LogGeneral)
        .save(log)
        .then(()=>{
            // Además de la BD, al log de la aplicación con el nivel equivalente (el nivel visible lo decide helpers/logger).
            const nivel = log.tipo === LogTipo.ERROR ? "error" : log.tipo === LogTipo.WARN ? "warn" : log.tipo === LogTipo.INFO ? "info" : "debug";
            logger[nivel](log.mensaje, log.data);
        })
        .catch(error=>{
            // NO SE PUEDE GUARDAR EL LOG DEL ERROR.
            logger.error("No se pudo guardar LogGeneral:", log.mensaje, error);
        });
    }
}