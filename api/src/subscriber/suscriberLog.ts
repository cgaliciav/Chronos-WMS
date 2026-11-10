import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent, DataSource } from "typeorm";
import { LogFuncionamiento, FuncionamientoEstado } from "../entity/LogFuncionamiento";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Sesion } from "../entity/Sesion";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { LogTipo } from "../entity/LogGeneral";
import { logger } from "../helpers/logger";

// import { LoadEvent } from "typeorm/subscriber/event/LoadEvent";

// Se usa la fuente de datos (`event.dataSource`) y no `event.manager`: el registro se escribe sin esperar (void), así que
// puede terminar después de que la transacción que lo disparó haya liberado su conexión.
const nuevaOperacion = async (dataSource:DataSource,entity:any,funcionamiento:FuncionamientoEstado)=>{
    if(entity === undefined)
        return;
    if (
      entity.constructor.name == "LogFuncionamiento" ||
      entity.constructor.name == "LogGeneral" ||
      entity.constructor.name == "LogPeticiones" ||
      entity.constructor.name == "Notificacion" // la crea el sistema, sin sesión (plan 02 · fase 7)
    )
      // Omitir las funcionamientoes sobre LogOperacion y LogGeneral.
      return;

    let dataJSON:string;
    if(entity.constructor.name=="Archivo"){
        const {data,...entitySinDatosArchivo}=entity;
        dataJSON=JSON.stringify(entitySinDatosArchivo);
    }
    else{
        dataJSON=JSON.stringify(entity);
    }
    if(dataJSON.length>60000){
        dataJSON="DEMASIADA INFORMACION. SE DECARTA PORQUE GENERA BUCLE INFINITO.";
    }
    const {name}=entity.constructor;
    const {id}=entity;
    

    //Crear y llegar LogOperacion.
    const  logOp = new LogFuncionamiento;
    logOp.data=dataJSON;
    logOp.entidadOrigen=name;
    logOp.idOrigen=id;
    logOp.funcionamiento=funcionamiento;
    const sesionId=entity.sesionId;
    if(entity.estatus !== undefined){ 
        if( entity.estatus === EstatusEstado.INACTIVO 
            && funcionamiento === FuncionamientoEstado.ACTUALIZACION ) { // Si estatus es INACTIVO y la funcionamiento es ACTUALIZACION, se trata realmente de ua DESACTIVACION de registro.
            logOp.funcionamiento=FuncionamientoEstado.DESACTIVACION;
        }
    }
    try {
        // Sin sesión se registra sin ella (hallazgo M31); TypeORM 1.x además rechaza `id: undefined` en el where
        if (sesionId !== undefined && sesionId !== null) {
            const sesion = await dataSource.getRepository(Sesion).findOneBy({ id: sesionId });
            if (sesion) logOp.sesion = sesion;
        }
        await dataSource.getRepository(LogFuncionamiento).save(logOp)
    } catch (error) {
        logger.error("Error en el suscriptor de auditoría:", (error as Error).message);
    }
}


@EventSubscriber()
export class GeneralSubscriber implements EntitySubscriberInterface{

    afterInsert(event: InsertEvent<any>){
        void nuevaOperacion(event.dataSource,event.entity,FuncionamientoEstado.NUEVO);
    }
    
    afterUpdate(event: UpdateEvent<any>){
        void nuevaOperacion(event.dataSource,event.entity,FuncionamientoEstado.ACTUALIZACION);
    }

    beforeRemove(event:RemoveEvent<any>){
        void nuevaOperacion(event.dataSource,event.entity,FuncionamientoEstado.ELIMINACION);
    }


}