import { AppDataSource } from "../data-source";
import { idSeguro } from "../helpers/ids";
import { FacturaDetalle } from "../entity/FacturaDetalle";
import { FacturaTipo } from "../entity/FacturaTipo";
import { Proveedor } from "../entity/Proveedor";

class FacturaDetalleController{

    // guardar
    static guardar=async(numero:string,fechaEmision:string|Date,total:number|string,impuestos:number|string,montoIngresado:number|string,
        proveedorId:number|string,facturaTipoId:number|string,sesionId:number)=>{
            const facturaDetalle = new FacturaDetalle();
            facturaDetalle.numero=numero;
            facturaDetalle.fechaEmision=new Date(fechaEmision);
            facturaDetalle.total=+total;
            facturaDetalle.impuestos=+impuestos;
            facturaDetalle.facturaTipo=await AppDataSource.getRepository(FacturaTipo).findOneByOrFail({ id: idSeguro(facturaTipoId, "facturaTipoId") });
            facturaDetalle.montoIngresado=+montoIngresado;
            facturaDetalle.proveedor=await AppDataSource.getRepository(Proveedor).findOneByOrFail({ id: idSeguro(proveedorId, "proveedorId") });
            facturaDetalle.sesionId=sesionId;

            return( 
                await AppDataSource.getRepository(FacturaDetalle).save(facturaDetalle)
            )
    }

    // quitar
    static quitar=async(facturaDetalle:FacturaDetalle,sesionId:number)=>{
        facturaDetalle.sesionId=sesionId;
        return(await AppDataSource.getRepository(FacturaDetalle).remove(facturaDetalle));
    }

    // editar
    static editar=async(facturaDetalle:FacturaDetalle,
        numero:string,fechaEmision:string|Date,total:number|string,impuestos:number|string,montoIngresado:number|string,
        proveedorId:number|string,facturaTipoId:number|string, sesionId:number)=>{
            facturaDetalle.numero=numero;
            facturaDetalle.fechaEmision=new Date(fechaEmision);
            facturaDetalle.total=+total;
            facturaDetalle.impuestos=+impuestos;
            facturaDetalle.facturaTipo=await AppDataSource.getRepository(FacturaTipo).findOneByOrFail({ id: idSeguro(facturaTipoId, "facturaTipoId") });
            facturaDetalle.montoIngresado=+montoIngresado;
            facturaDetalle.proveedor=await AppDataSource.getRepository(Proveedor).findOneByOrFail({ id: idSeguro(proveedorId, "proveedorId") });
            facturaDetalle.sesionId=sesionId;

            return( 
                await AppDataSource.getRepository(FacturaDetalle).save(facturaDetalle)
            )
    }


}

export default FacturaDetalleController;