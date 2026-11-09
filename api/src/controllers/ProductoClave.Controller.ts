

import { NextFunction, Request, Response } from "express";
import { getRepository, EntityManager, getManager } from "typeorm";
import { Producto } from "../entity/Producto";
import { ProductoClave } from "../entity/ProductoClave";
import { AppError } from "../helpers/errorClases";
import { idSeguro } from "../helpers/ids";

const autogenerarCodigo=async()=>{

    // TODO (fase 3): dos llamadas concurrentes pueden generar el mismo código; la restricción UNIQUE de `barras` lo detecta.
    const lastreg=await getRepository(ProductoClave).findOne({order:{id:"DESC"}})
    const autoCodigo=((lastreg?.id ?? 0)+5000).toString();
    return {
        barras: autoCodigo.padStart(10, "0"),
        barrasTipo:'Autogenerada'
    }

}

class ProductoClaveController{

    // XXX NO SE DEBEN BORRAR NI EDITAR CODIGOS ASIGNADOS.

    
    static guardar=async (productoCodigos:{barras:string,barrasTipo:string}[],sesionId:number,manager:EntityManager=getManager())=>{
        const pc=productoCodigos.map(ppcc => {
            const ppccNuevo=new ProductoClave();
            ppccNuevo.barras=ppcc.barras;
            ppccNuevo.barrasTipo=ppcc.barrasTipo;
            ppccNuevo.sesionId=sesionId;
            return ppccNuevo;
        })

        return(
            await manager.save(pc)
        )

    }

    static nuevo = async (req: Request, res: Response, next:NextFunction) =>{
        const {productoCodigo,productoId}=req.body;
        const {jwtPayload}=res.locals;
        try {
            const code:string=productoCodigo.barras.trim();
            if(code.length===0){
                throw new AppError("El codigo del producto no puede estar vacío",401);
            }
            const producto=await getRepository(Producto).findOneOrFail(productoId,{relations:["productoClaves"],loadEagerRelations:false});
            const clavesNuevas = await ProductoClaveController.guardar([{barras:code,barrasTipo:productoCodigo.barrasTipo}],jwtPayload.si);
            const {productoClaves} = producto;
            for (const claveNueva of clavesNuevas) {
                productoClaves.push(claveNueva);
            }
            
            producto.sesionId=jwtPayload.si;
            await getRepository(Producto).save(producto);

            res.json();
        } catch (error) {
            next(error)
        }
    }

    static nuevoAutogenerado = async (req: Request, res: Response, next:NextFunction) =>{
        const {productoId}=req.body;
        const {jwtPayload}=res.locals;
        try {
            const producto=await getRepository(Producto).findOneOrFail(productoId,{relations:["productoClaves"],loadEagerRelations:false});
            const codigoAutogenerado=await autogenerarCodigo();

            const clavesNuevas = await ProductoClaveController.guardar( [codigoAutogenerado], jwtPayload.si);            
            const {productoClaves} = producto;
            for (const claveNueva of clavesNuevas) {
                productoClaves.push(claveNueva);
            }

            producto.sesionId=jwtPayload.si;
            await getRepository(Producto).save(producto);
            res.json(codigoAutogenerado);
        } catch (error) {
            next(error)
        }
    }

    static borrar = async (req: Request, res: Response, next:NextFunction) =>{
        const {productoId,productoClaveId}=req.body;
        const {jwtPayload}=res.locals;
        try{

            const claveId = idSeguro(productoClaveId, "productoClaveId");
            const producto=await getRepository(Producto).findOneOrFail(idSeguro(productoId, "productoId"),{relations:["productoClaves"],loadEagerRelations:false});
            
            const {productoClaves}=producto;
            if(!productoClaves.some(pc=>pc.id===claveId)){
                throw new AppError("El código no pertenece al producto",404); // hallazgo M8
            }
            if(productoClaves.length===1){
                throw new AppError("No se puede borrar el código. Debe exitir al menos un código en el producto",401);
            }
            producto.productoClaves=productoClaves.filter(pc=>pc.id!==claveId);

            const productoClavePorRemover = await getRepository(ProductoClave).findOneOrFail(claveId);
            productoClavePorRemover.sesionId=jwtPayload.si;
            await getRepository(ProductoClave).remove( productoClavePorRemover );
            
            producto.sesionId=jwtPayload.si;
            await getRepository(Producto).save(producto);
            res.json();

        }catch (error) {
            next(error)
        }
    }

    // static borrar = async (req: Request, res: Response, next:NextFunction) =>{
    //     const {jwtPayload}=res.locals;
    //     try{

    //         res.json();

    //     }catch (error) {
    //         next(error)
    //     }
    // }
    

    // static editar = async (req: Request, res: Response, next:NextFunction) =>{
    //     const {jwtPayload}=res.locals;
    //     try{
    //         res.json();
    //     }catch (error) {
    //         next(error)
    //     }
    // }

}

export default ProductoClaveController;
export {autogenerarCodigo};