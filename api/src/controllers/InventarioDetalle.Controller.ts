import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";
import { Bodega } from "../entity/Bodega";
import { InventarioDetalle } from "../entity/InventarioDetalle";

class InventarioDetalleController{

    // guardar
    static guardar = async(fechaInicio:string|Date,fechaFin:string|Date|undefined,bodegaId:number|string,
        sesionId:number)=>{
            const inventarioDetalle=new InventarioDetalle();
            inventarioDetalle.fechaInicio=new Date(fechaInicio);
            if(fechaFin!==undefined && fechaFin!==null && fechaFin!==""){ // antes la condición estaba invertida (hallazgo M6)
                inventarioDetalle.fechaFin=new Date(fechaFin);
            }
            inventarioDetalle.bodega=await getRepository(Bodega).findOneOrFail(bodegaId);
            inventarioDetalle.sesionId=sesionId;

            return(
                await getRepository(InventarioDetalle).save(inventarioDetalle)
            )
    }

    // quitar
    static quitar=async(inventarioDetalle:InventarioDetalle,sesionId:number)=>{
        inventarioDetalle.sesionId=sesionId;
        return (await getRepository(InventarioDetalle).remove(inventarioDetalle));
    }

    // editar
    static editar = async(inventarioDetalle:InventarioDetalle,fechaInicio:string|Date,fechaFin:string|Date,bodegaId:number|string,
        sesionId:number)=>{
            inventarioDetalle.fechaInicio=new Date(fechaInicio);
            inventarioDetalle.fechaFin=new Date(fechaFin);
            inventarioDetalle.bodega=await getRepository(Bodega).findOneOrFail(bodegaId);
            inventarioDetalle.sesionId=sesionId;
            return(
                await getRepository(InventarioDetalle).save(inventarioDetalle)
            )
    }

    

}

export default InventarioDetalleController;