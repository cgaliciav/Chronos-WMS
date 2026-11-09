import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";
import { InventarioDetalle } from "../entity/InventarioDetalle";

// Solo se conserva `quitar`: lo usa GrupoDetalleController al borrar grupos de inventario antiguos.
// Crear y editar inventarios físicos (POST /groups/new-inventory, PUT /groups/edit-inventory) se retiró:
// la característica nunca se terminó ni se usó.
class InventarioDetalleController{

    // quitar
    static quitar=async(inventarioDetalle:InventarioDetalle,sesionId:number)=>{
        inventarioDetalle.sesionId=sesionId;
        return (await getRepository(InventarioDetalle).remove(inventarioDetalle));
    }


}

export default InventarioDetalleController;