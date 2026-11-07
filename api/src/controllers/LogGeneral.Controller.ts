import { isError } from "lodash";
import { getRepository } from "typeorm";
import { LogGeneral, LogTipo } from "../entity/LogGeneral";

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
        else if(isError(data))
            log.data=data.message;
        else 
            log.data=JSON.stringify(data);
        
        getRepository(LogGeneral)
        .save(log)
        .then(()=>{
            // SI TODO ESTA BIEN NO HAY NECESIDAD DE HACER NADA... 
            // if(process.env.NODE_ENV!=='production'){
                if((process.env.LOG_CONSOLE_VERBOSE.toLowerCase().indexOf('error') >=0 ) && (log.tipo===LogTipo.ERROR) )
                    console.log(log);
                if((process.env.LOG_CONSOLE_VERBOSE.toLowerCase().indexOf('warn') >=0 ) && (log.tipo===LogTipo.WARN) )
                    console.log(log);
                if((process.env.LOG_CONSOLE_VERBOSE.toLowerCase().indexOf('info') >=0 ) && (log.tipo===LogTipo.INFO) )
                    console.log(log);
                if((process.env.LOG_CONSOLE_VERBOSE.toLowerCase().indexOf('silly') >=0 ) && (log.tipo===LogTipo.SILLY) )
                    console.log(log);
                if((process.env.LOG_CONSOLE_VERBOSE.toLowerCase().indexOf('debug') >=0 ) && (log.tipo===LogTipo.DEBUG) )
                    console.log(log);
            // }
    
        })
        .catch(error=>{
            // NO SE PUEDE GUARDAR EL LOG DEL ERROR.
            console.error("¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡ESTAMOS MUY MAL!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",error);
        });
    }
}