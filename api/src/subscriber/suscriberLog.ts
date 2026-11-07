import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent, BaseEntity, Entity, getRepository, Connection } from "typeorm";
import { LogFuncionamiento, FuncionamientoEstado } from "../entity/LogFuncionamiento";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Sesion } from "../entity/Sesion";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { LogTipo } from "../entity/LogGeneral";

// import { LoadEvent } from "typeorm/subscriber/event/LoadEvent";

const nuevaOperacion = async (connection:Connection,entity:any,funcionamiento:FuncionamientoEstado)=>{
    if(entity === undefined)
        return;
    if (
      entity.constructor.name == "LogFuncionamiento" ||
      entity.constructor.name == "LogGeneral" ||
      entity.constructor.name == "LogPeticiones"
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
        const sesion = await connection.getRepository(Sesion).findOneOrFail(sesionId);
        logOp.sesion=sesion
        await connection.getRepository(LogFuncionamiento).save(logOp)
    } catch (error) {
        console.log("Error en suscriptor", error);
    }
}


@EventSubscriber()
export class GeneralSubscriber implements EntitySubscriberInterface{

    afterInsert(event: InsertEvent<any>){
        nuevaOperacion(event.connection,event.entity,FuncionamientoEstado.NUEVO);
    }
    
    afterUpdate(event: UpdateEvent<any>){
        nuevaOperacion(event.connection,event.entity,FuncionamientoEstado.ACTUALIZACION);
    }

    beforeRemove(event:RemoveEvent<any>){
        nuevaOperacion(event.connection,event.entity,FuncionamientoEstado.ELIMINACION);
    }


}