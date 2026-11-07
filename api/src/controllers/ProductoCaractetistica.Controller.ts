

import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";
import { Producto } from "../entity/Producto";
import { ProductoCaracteristica } from "../entity/ProductoCaracteristica";



class ProductoCaracteristicaController{
    
    static guardar=async(productoCaracteristicas:{llave:string,valor:string}[],sesionId:number)=>{
        const pc=productoCaracteristicas.map(ppcc => {
            const ppccNuevo=new ProductoCaracteristica();
            ppccNuevo.llave=ppcc.llave;
            ppccNuevo.valor=ppcc.valor;
            ppccNuevo.sesionId=sesionId;
            return ppccNuevo;
        })

        return(
            await getRepository(ProductoCaracteristica).save(pc)
        )
    }

    // static guardarUno=async(productoCaracteristicas:{llave:string,valor:string},sesionId:number)=>{
    //     const pc=new ProductoCaracteristica();
    //     pc.llave=productoCaracteristicas.llave;
    //     pc.valor=productoCaracteristicas.valor;
    //     pc.sesionId=sesionId;
    //     return(
    //         await getRepository(ProductoCaracteristica).save(pc)
    //     )
    // }

    static quitar=async (productoCaracteristicas:ProductoCaracteristica[],sesionId:number)=>{
        productoCaracteristicas.forEach(pc=>{ pc.sesionId=sesionId});
        return(
            await getRepository(ProductoCaracteristica).remove(productoCaracteristicas)
        )
    }

    // static quitarUno=async (productoCaracteristicas:ProductoCaracteristica,sesionId:number)=>{
    //     productoCaracteristicas.sesionId=sesionId;
    //     return(
    //         await getRepository(ProductoCaracteristica).remove(productoCaracteristicas)
    //     )

    // }

    static modificar=async(productoCaracteristicas:ProductoCaracteristica, productoCaracteristicasNuevo:{llave:string,valor:string},sesionId:number)=>{
        productoCaracteristicas.sesionId=sesionId;
        productoCaracteristicas.llave=productoCaracteristicasNuevo.llave;
        productoCaracteristicas.valor=productoCaracteristicasNuevo.valor;
        return(
            await getRepository(ProductoCaracteristica).save(productoCaracteristicas)
        )
    }

    static  nuevo = async (req: Request, res: Response, next:NextFunction) =>{
        const {productoId,productoCaracteristicas:productoCaracteristicasNuevo}=req.body;
        const {jwtPayload}=res.locals;
        try {
            console.log("nuevo Producto Característica", {productoId,productoCaracteristicasNuevo});
            const producto=await getRepository(Producto).findOneOrFail(productoId,{relations:["productoCaracteristicas"],loadEagerRelations:false});
            const nuevasCaracteristicas=await ProductoCaracteristicaController.guardar(productoCaracteristicasNuevo,jwtPayload.si);
            const {productoCaracteristicas}= producto;
            for (const caracteristicas of nuevasCaracteristicas) {
                productoCaracteristicas.push(caracteristicas)
            }
            // for(const caracteristicas of nuevasCaracteristicas)
            
            // producto.productoCaracteristicas.concat(nuevasCaracteristicas);
            producto.sesionId=jwtPayload.si;
            await getRepository(Producto).save(producto);
            res.json();
        } catch (error) {
            next(error)
        }
    }

    static borrar = async (req: Request, res: Response, next:NextFunction) =>{
        const {productoId,productoCaracteristicasId}=req.body;
        const {jwtPayload}=res.locals;
        try{

            const producto=await getRepository(Producto).findOneOrFail(productoId,{relations:["productoCaracteristicas"],loadEagerRelations:false});
            producto.productoCaracteristicas=producto.productoCaracteristicas.filter(pc=>pc.id!=productoCaracteristicasId);
            
            await ProductoCaracteristicaController.quitar(
                [await getRepository(ProductoCaracteristica).findOneOrFail(productoCaracteristicasId)],
                jwtPayload.si
            )

            producto.sesionId=jwtPayload.si;
            await getRepository(Producto).save(producto);
            res.json();

        }catch (error) {
            next(error)
        }
    }

    static editar = async (req: Request, res: Response, next:NextFunction) =>{
        const {productoCaracteristicas,productoCaracteristicasId}=req.body;
        const {jwtPayload}=res.locals;
        try{
            console.log("editar Producto Característica", {productoCaracteristicasId,productoCaracteristicas});
            await ProductoCaracteristicaController.modificar(
                await getRepository(ProductoCaracteristica).findOneOrFail(productoCaracteristicasId),
                productoCaracteristicas,
                jwtPayload.si
            )
            res.json();
        }catch (error) {
            next(error)
        }
    }

}

export default ProductoCaracteristicaController;