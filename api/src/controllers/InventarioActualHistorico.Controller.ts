import { AppDataSource } from "../data-source";
import { idSeguro } from "../helpers/ids";
import { InventarioActual } from "../entity/InventarioActual";
import { InventarioActualHistorico } from "../entity/InventarioActualHistorico";


class InventarioActualHistoricoController{
    static guardar=async (inventarioActual:InventarioActual,sesionId:number)=>{
        const inventarioActualHistorico=new InventarioActualHistorico();
        inventarioActualHistorico.cantidad=inventarioActual.cantidad;
        inventarioActualHistorico.cantidadAlmacen=inventarioActual.cantidadAlmacen;
        inventarioActualHistorico.disponible=inventarioActual.disponible;
        inventarioActualHistorico.estatus=inventarioActual.estatus;
        inventarioActualHistorico.fechaDisponibilidad=inventarioActual.fechaDisponibilidad;
        inventarioActualHistorico.idOriginal=inventarioActual.id;
        inventarioActualHistorico.sesionId=sesionId;
        return (await AppDataSource.getRepository(InventarioActualHistorico).save(inventarioActualHistorico));
    }

    static obtenerHistorico=async(inventarioActualId:number|string)=>{
        return (await AppDataSource.getRepository(InventarioActualHistorico).findOne({where:{idOriginal:idSeguro(inventarioActualId, "inventarioActualId")}, order:{id:"DESC"}}));
    }

    static quitar=async(inventarioActualHistorico:InventarioActualHistorico,sesionId:number)=>{
        inventarioActualHistorico.sesionId=sesionId;
        return (await AppDataSource.getRepository(InventarioActualHistorico).remove(inventarioActualHistorico));
    }

}

export default InventarioActualHistoricoController;