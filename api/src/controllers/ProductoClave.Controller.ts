

import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Producto } from "../entity/Producto";
import { ProductoClave } from "../entity/ProductoClave";
import { AppError } from "../helpers/errorClases";

const autogenerarCodigo=async()=>{

    const lastreg=await getRepository(ProductoClave).findOne({order:{id:"DESC"}})
    console.log("autogenerarCodigo",lastreg);
    const autoCodigo=(lastreg.id+5000).toString();
    let fill:string;
    if(autoCodigo.length<10){
        fill="0".repeat(10-autoCodigo.length);  
    }
    return {
        barras:`${fill}${autoCodigo}`,
        barrasTipo:'Autogenerada'
    }

}

class ProductoClaveController{

    // XXX NO SE DEBEN BORRAR NI EDITAR CODIGOS ASIGNADOS.

    
    static guardar=async (productoCodigos:{barras:string,barrasTipo:string}[],sesionId:number)=>{
        const pc=productoCodigos.map(ppcc => {
            const ppccNuevo=new ProductoClave();
            ppccNuevo.barras=ppcc.barras;
            ppccNuevo.barrasTipo=ppcc.barrasTipo;
            ppccNuevo.sesionId
            return ppccNuevo;
        })

        return(
            await getRepository(ProductoClave).save(pc)
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

            const producto=await getRepository(Producto).findOneOrFail(productoId,{relations:["productoClaves"],loadEagerRelations:false});
            
            const {productoClaves}=producto;
            if(productoClaves.length===1){
                throw new AppError("No se puede borrar el código. Debe exitir al menos un código en el producto",401);
            }
            producto.productoClaves=productoClaves.filter(pc=>pc.id!=productoClaveId);

            const productoClavePorRemover = await getRepository(ProductoClave).findOneOrFail(productoClaveId);
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