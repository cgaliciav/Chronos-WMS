import { NextFunction, Request, Response } from "express";
import { Brackets, getRepository, In } from "typeorm";
import { Bodega } from "../entity/Bodega";
import { InventarioActual, InventarioDisponible } from "../entity/InventarioActual";
import { Operacion } from "../entity/Operacion";
import { Producto } from "../entity/Producto";
import { AppError } from "../helpers/errorClases";
import { andWhereIn, textoBusquedaBooleana } from "../helpers/filtrosTabla";
import { idSeguro, idsSeguros } from "../helpers/ids";
import CommonController, { ResultadoTabla } from "./common/Common.Controller";
import InventarioActualHistoricoController from "./InventarioActualHistorico.Controller";
import ProductoController from "./Producto.Controller";
// import { supabase } from "../helpers/_SupabaseConfig";
import { InventarioEstado } from '../entity/ProductoInventariado';
import { ValidacionEstado } from "../entity/ProductoValidado";


const queryBusqueda = () => {
    return (
        getRepository(InventarioActual)
            .createQueryBuilder("inventarioActual")
            .leftJoinAndSelect("inventarioActual.bodega", "bodega")
            .leftJoinAndSelect("inventarioActual.producto", "producto")
            .leftJoin("producto.area", "area")
            .addSelect("area.nombre")
            .leftJoin("producto.productoTipo", "productoTipo")
            .addSelect(["productoTipo.nombre", "productoTipo.ID"])
            .leftJoin("producto.archivos", "archivos")
            .addSelect("archivos.id")
            .leftJoin("producto.productoClaves", "productoClaves")
            .addSelect("productoClaves.barras")
            .leftJoin("producto.productoPrecios", "productoPrecios")
            .addSelect("productoPrecios.precio")
            .leftJoin("productoPrecios.precioTipo", "precioTipo")
            .addSelect(["precioTipo.nombre", "precioTipo.id"])
            .leftJoinAndSelect("producto.productoValidado", "productoValidado")
            .leftJoinAndSelect("producto.productoInventarios", "productoInventarios")

    )

}

const queryBusquedaOperacion = () => {
    return (
        // getRepository(Operacion)
        // .createQueryBuilder("operacion")
        getRepository(InventarioActual)
            .createQueryBuilder("inventarioActual")
            .leftJoin("inventarioActual.movimientos", "movimiento")
            .innerJoin("movimiento.operacion", "operacion")
            .innerJoin("operacion.proyecto", "proyecto")
            .innerJoin("operacion.movimientoTipo", "movimientoTipo")
            .leftJoinAndSelect("inventarioActual.bodega", "bodega")
            .leftJoinAndSelect("inventarioActual.producto", "producto")
            .leftJoin("producto.area", "area")
            .addSelect("area.nombre")
            .leftJoin("producto.productoTipo", "productoTipo")
            .addSelect("productoTipo.nombre")
            .leftJoin("producto.archivos", "archivos")
            .addSelect("archivos.id")
            .leftJoin("producto.productoClaves", "productoClaves")
            .addSelect("productoClaves.barras")
            .leftJoin("producto.productoPrecios", "productoPrecios")
            .addSelect("productoPrecios.precio")
            .leftJoin("productoPrecios.precioTipo", "precioTipo")
            .addSelect("precioTipo.nombre")
    )

}

const queryBusquedaCatalogo = ({
    textoBusqueda,
    areasIds,
    bodegaIds,
    estados,
    con_foto,
}) => {
    const query = queryBusqueda().where("precioTipo.id=2");
    andWhereIn(query, "area.id", idsSeguros(areasIds ?? [], "areasIds"), "areasIds");
    andWhereIn(query, "inventarioActual.disponible", estados ?? [], "estados");

    const texto = textoBusquedaBooleana(textoBusqueda);
    if (texto !== null) {
        // Búsqueda de texto completo con el literal ESCAPADO por el driver y sin operadores booleanos sueltos
        // (antes se interpolaba sin escapar: hallazgo C2). MariaDB no admite parámetros preparados dentro de AGAINST(...).
        const subquery = getRepository(Producto)
            .createQueryBuilder("producto")
            .select("producto.id")
            .where(new Brackets(qb =>
                qb
                    .where(`MATCH(producto.titulo) AGAINST (${texto} IN BOOLEAN MODE)`)
                    .orWhere(`MATCH(producto.descripcion) AGAINST (${texto} IN BOOLEAN MODE)`)
            ));
        query.andWhere('producto.id IN (' + subquery.getQuery() + ')');
    }
    // if ((textoBusqueda !== "") && (textoBusqueda ?? false)) {
    //     query.andWhere(
    //         new Brackets((qb) =>
    //             qb
    //                 .where(
    //                     `MATCH(producto.titulo) AGAINST ('${textoBusqueda}' IN BOOLEAN MODE)`
    //                 )
    //                 .orWhere(
    //                     `MATCH(producto.descripcion) AGAINST ('${textoBusqueda}' IN BOOLEAN MODE)`
    //                 )
    //         )
    //     );
    // }

    if (con_foto) {
        query.andWhere("archivos.id IS NOT NULL");
    }

    // console.log(query.getQuery());

    return query;

    // if(esBajas){ // BUSQUEDA DE BAJAS
    //     if(textoBusqueda==="")
    //         query.where("area.id in (:...ids)",{ids:areasIds});
    //     else
    //         query.where( new Brackets (qb =>
    //             qb.where(`MATCH(producto.titulo) AGAINST ('${textoBusqueda}' IN BOOLEAN MODE)`)
    //             .orWhere(`MATCH(producto.descripcion) AGAINST ('${textoBusqueda}' IN BOOLEAN MODE)`)
    //             .orWhere(`productoClaves.barras LIKE '%${textoBusqueda}%'`)
    //             ) )
    //     query.andWhere("inventarioActual.disponible='baja'");
    // } else if(esCodigo) { // BUSQUEDA POR CODIGO
    //     let codigosBusqueda:string[]=[];
    //     if(!Array.isArray(codigoProducto)){
    //         codigosBusqueda=[codigoProducto];
    //     }else{
    //         codigosBusqueda=[...codigoProducto]
    //     }
    //     query.where( new Brackets (qb => {
    //         codigosBusqueda.forEach((cod,idx)=>{
    //             if(idx===0)
    //                 qb.where(`productoClaves.barras LIKE '%${cod}%'`);
    //             else
    //                 qb.orWhere(`productoClaves.barras LIKE '%${cod}%'`);
    //         })
    //         return qb
    //     }));
    //     // query.where("productoClaves.barras in (:codigosBusqueda)",{codigosBusqueda});
    //     // query=query.where( new Brackets (qb =>
    //     //     qb.where(`productoClaves.barras LIKE '%${codigoProducto}%'`)

    //     //     ) )
    //     // query.where(`productoClaves.barras LIKE '%${codigoProducto}%'`);
    // } else { // BUSQUEDA GENERAL
    //     if(textoBusqueda==="")
    //         query=query.where("area.id in (:...ids)",{ids:areasIds});
    //     else
    //         query=query.where( new Brackets (qb =>
    //             qb.where(`MATCH(producto.titulo) AGAINST ('${textoBusqueda}' IN BOOLEAN MODE)`)
    //             .orWhere(`MATCH(producto.descripcion) AGAINST ('${textoBusqueda}' IN BOOLEAN MODE)`)
    //             // .orWhere(`productoClaves.barras LIKE '%${textoBusqueda}%'`)
    //             ) )
    //             .andWhere("area.id in (:...ids)",{ids:[...areasIds]});
    //     if(estado!=="todos"){
    //         query=query.andWhere("inventarioActual.disponible=:edo",{edo:estado});
    //         query=query.andWhere("inventarioActual.disponible<>'baja'");
    //     }
    //     else{
    //         query=query.andWhere("inventarioActual.disponible<>'baja'");
    //     }
    // }

    // query.andWhere("precioTipo.id=2");
    // return query;
};

const queryBusquedaCodigos = (codigosBusqueda: (number | string)[]) => {

    return (
        queryBusqueda()
            .where(new Brackets(qb => {
                // LIKE parametrizado por código (hallazgo C2)
                codigosBusqueda.forEach((cod, idx) => {
                    const parametro = { [`codigo${idx}`]: `%${String(cod).trim()}%` };
                    if (idx === 0)
                        qb.where(`productoClaves.barras LIKE :codigo${idx}`, parametro);
                    else
                        qb.orWhere(`productoClaves.barras LIKE :codigo${idx}`, parametro);
                })
                return qb
            }))
            .andWhere("precioTipo.id=2")
    )

}

// const queryBusquedaBajas = ({ })=>{

// }

const queryBusquedaProyecto = ({
    textoBusqueda,
    areasIds,
    bodegaIds,
    // estados,
    proyectoId,
    movimientosTipoIds
}) => {

    // queryBusquedaOperacion
    const query = queryBusquedaOperacion()
        .where("precioTipo.id=2")
        .andWhere("proyecto.id=:proyectoId", { proyectoId: idSeguro(proyectoId, "proyectoId") });
    andWhereIn(query, "area.id", idsSeguros(areasIds ?? [], "areasIds"), "areasIds");
    andWhereIn(query, "bodega.id", idsSeguros(bodegaIds ?? [], "bodegaIds"), "bodegaIds");
    andWhereIn(query, "movimientoTipo.id", idsSeguros(movimientosTipoIds ?? [], "movimientosTipoIds"), "movimientosTipoIds");
    const texto = textoBusquedaBooleana(textoBusqueda);
    if (texto !== null) {
        query.andWhere(new Brackets(qb =>
            qb.where(`MATCH(producto.titulo) AGAINST (${texto} IN BOOLEAN MODE)`)
                .orWhere(`MATCH(producto.descripcion) AGAINST (${texto} IN BOOLEAN MODE)`)
        ));
    }

    return query;

}

const queryBusquedaFacturas = ({ }) => {


}

const crearBaseInventarioActual = async (cantidad: number | string, bodegaId: number | string, sesionId: number) => {
    const inventarioActual = new InventarioActual();
    inventarioActual.cantidad = +cantidad;
    inventarioActual.cantidadAlmacen = +cantidad;
    inventarioActual.fechaDisponibilidad = new Date();
    inventarioActual.bodega = await getRepository(Bodega).findOneOrFail(bodegaId);
    inventarioActual.sesionId = sesionId;

    return inventarioActual;
}


const fnQueryId = (id: number | string) => {
    return getRepository(InventarioActual)
        .createQueryBuilder("inventarioActual")
        .leftJoinAndSelect("inventarioActual.bodega", "bodega")
        .leftJoinAndSelect("inventarioActual.producto", "producto")
        .leftJoin("producto.area", "area")
        .addSelect(["area.id", "area.nombre"])
        .leftJoin("producto.productoTipo", "productoTipo")
        .addSelect(["productoTipo.nombre", "productoTipo.id"])
        .leftJoin("producto.archivos", "archivos")
        .addSelect("archivos.id")
        .leftJoin("producto.productoCaracteristicas", "productoCaracteristicas")
        .addSelect([
            "productoCaracteristicas.id",
            "productoCaracteristicas.llave",
            "productoCaracteristicas.valor",
        ])
        .leftJoin("producto.productoClaves", "productoClaves")
        .addSelect([
            "productoClaves.id",
            "productoClaves.barras",
            "productoClaves.barrasTipo",
        ])
        .leftJoin("producto.productoPrecios", "productoPrecios")
        .addSelect(["productoPrecios.id", "productoPrecios.precio", "productoPrecios.moneda"])
        .leftJoin("productoPrecios.precioTipo", "precioTipo")
        .addSelect(["precioTipo.id", "precioTipo.nombre"])
        .leftJoin("producto.comentarios", "comentarios")
        .addSelect([
            "comentarios.comentario",
            "comentarios.fecha",
            "comentarios.id",
        ])
        .leftJoinAndSelect("producto.productoValidado", "productoValidado")
        .leftJoinAndSelect("producto.productoInventarios", "productoInventarios")
        .leftJoin("comentarios.sesion", "sesionComentario")
        .addSelect(["sesionComentario.id"])
        .leftJoin("sesionComentario.usuario", "usuarioComentario")
        .addSelect("usuarioComentario.nombre", "usuarioComentario.id")
        .where("inventarioActual.id=:id", { id });
}





class InventarioActualController {
    // static guardarConHistorico= async(inventarioActual:InventarioActual,sesionId:number)=>{
    //     inventarioActual.sesionId=sesionId;
    //     await InventarioActualHistoricoController.guardar(inventarioActual,sesionId);
    //     return(await getRepository(InventarioActual).save(inventarioActual));
    // }

    static guardarHistorico = async (inventarioActual: InventarioActual, sesionId: number) => {
        return (await InventarioActualHistoricoController.guardar(inventarioActual, sesionId));
    }

    static guardar = async (inventarioActual: InventarioActual, sesionId: number) => {
        inventarioActual.sesionId = sesionId;
        return (await getRepository(InventarioActual).save(inventarioActual));
    }


    static obtenerInventarioActualDeId = async (id: number | string) => {

        const qry = getRepository(InventarioActual)
            .createQueryBuilder("inventarioActual")
            .innerJoinAndSelect("inventarioActual.producto", "producto")
            .leftJoin("inventarioActual.bodega", "bodega")
            .addSelect("bodega.nombre")
            .leftJoin("producto.area", "area")
            .addSelect("area.nombre")
            .leftJoin("producto.productoClaves", "productoClaves")
            .addSelect("productoClaves.barras")
            .leftJoin("producto.productoPrecios", "productoPrecios")
            .addSelect("productoPrecios.precio")
            .leftJoin("productoPrecios.precioTipo", "precioTipo")
            .addSelect("precioTipo.nombre")
            .where('inventarioActual.id= :id', { id: idSeguro(id, "inventarioActualId") })
        const registro = await qry.getOne();
        if (registro === undefined || registro === null) {
            throw new AppError(`No existe el inventario ${id}`, 404)
        }
        return registro
    }

    static obtenerInventarioActualDeCodigo = async (codigo: string) => {

        if (typeof codigo !== "string" || codigo.trim().length < 4) {
            throw new AppError("Código inválido", 400);
        }
        codigo = codigo.trim();
        const qry = getRepository(InventarioActual)
            .createQueryBuilder("inventarioActual")
            .innerJoinAndSelect("inventarioActual.producto", "producto")
            .leftJoin("inventarioActual.bodega", "bodega")
            .addSelect("bodega.nombre")
            .leftJoin("producto.area", "area")
            .addSelect("area.nombre")
            .leftJoin("producto.productoClaves", "productoClaves")
            .addSelect("productoClaves.barras")
            .leftJoin("producto.archivos", "archivos")
            .addSelect("archivos.id")
            .leftJoin("producto.productoPrecios", "productoPrecios")
            .addSelect("productoPrecios.precio")
            .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
        // .addSelect(["precioTipo.nombre"]);
        if (codigo.length >= 10) {
            qry.where("productoClaves.barras=:codigo", { codigo })
        } else {
            qry.where("productoClaves.barras LIKE :codigo", { codigo: `%${codigo}` })
        }
        const registros = await qry.getMany();
        if (registros.length > 1) {
            throw new AppError(`Hay mas de un artículo con el código ${codigo}`, 400)
        }
        else if (registros.length === 0) {
            throw new AppError(`No existe ningún artículo con el código ${codigo}`, 400)
        }
        return registros[0]
    }

    // quitar
    static quitar = async (inventarioActual: InventarioActual, sesionId: number) => {
        inventarioActual.sesionId = sesionId;
        await ProductoController.quitar(inventarioActual.producto, sesionId);
        return (await getRepository(InventarioActual).remove(inventarioActual));
    }

    static borrar = async (req: Request, res: Response, next: NextFunction) => {
        const { inventarioActualId } = req.body;
        const { jwtPayload } = res.locals;
        try {
            await InventarioActualController.quitar(
                await getRepository(InventarioActual).findOneOrFail(idSeguro(inventarioActualId, "inventarioActualId"), { relations: ["producto"] }),
                jwtPayload.si
            );
            res.json();
        } catch (error) {
            next(error);
        }
    }

    static export2Supabase = async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        try {
            const resp = await CommonController.obtenerIdQuery(
                fnQueryId(id)
            );
            if (resp === undefined) {
                throw new AppError("No se encontró el registro", 404);
            }

            // // Resp destructuring
            // const { bodega, producto, estatus, disponible } = resp;
            // const { area, archivos, productoClaves, productoPrecios, productoValidado /*, comentarios*/ } = producto;

            // Getting area and warehouse Supabase ids
            // const respAreas = await supabase.from('areas').select('id').eq('old_id', area.id).single();
            // // const respWarehouse = await supabase.from('warehouses').select('id').eq('old_id', bodega.id).single();
            // const respWarehouse = await supabase.from('warehouses').select('id').eq('old_id', 1).single();



            // ** SEARCH FOR A PRE-EXISTING PRODUCT IN SUPABASE
            // **********
            // **********
            // const { data:dataSearch, error:errorSearch } = await supabase.from('products').select().eq('old_id', producto.id).single();
            // const dataId = dataSearch?.id;

            // if (errorSearch) {
            //     console.log("Error al buscar en SUPABASE", errorSearch);
            //     throw new AppError("Error al buscar en SUPABASE", 500);
            // }
            // **********
            // **********


            // ** CREATE A NEW PRODUCT IN SUPABASE
            // ** COMMENT IN CASE YOU SEARCH FOR A PRE-EXISTING PRODUCT IN SUPABASE
            // **********
            // **********

            // Getting aviability
            // const aviability = convertAviability(disponible);
            // Create new product in Supabase
            // const { data, error } = await supabase
            //     .from('products')
            //     .insert([{
            //         title: producto.titulo,
            //         description: producto.descripcion,
            //         purchase_price: productoPrecios.find(precio => precio.precioTipo.id === 2).precio,
            //         currency: 'MXP',
            //         active_price: productoPrecios.find(precio => precio.precioTipo.id === 1).precio,
            //         rent_price: productoPrecios.find(precio => precio.precioTipo.id === 4).precio,
            //         loan_price: productoPrecios.find(precio => precio.precioTipo.id === 3).precio,
            //         area_id: respAreas.data?.id,
            //         warehouse_id: respWarehouse.data?.id,
            //         status: estatus === 'activo' ? 'active' : 'inactive',
            //         old_id: producto.id,
            //         aviability
            //     }])
            //     .select();
            // if (error) {
            //     console.log("Error al insertar en SUPABASE", error);
            //     throw new AppError("Error al insertar en SUPABASE", 500);
            // }
            // const dataId = data[0].id;
            // **********
            // **********


            // try {
            //     // AGREGO EL CODIGO DE BARRAS AL PRODUCTO
            //     productoClaves?.forEach(async (clave, idx) => {
            //         const { error } = await supabase.from('product_barcodes').insert([{ product_id: dataId, barcode: clave.barras, is_primary: idx === 0 }]);
            //         if (error) {
            //             console.log("Error al insertar PRODUCT_BARCODE en SUPABASE", error);
            //             // throw new AppError("Error al insertar en SUPABASE", 500);
            //         }
            //     });
            // } catch (error) {
            //     console.log(">>>>>>>>>>>>>>>>>", { productoClaves, error });

            // }

            // // AGREGO LAS IMAGENES AL PRODUCTO
            // try {

            //     archivos?.forEach(async (archivo, idx) => {
            //         const { image_url: image_path /*, image_path_catalog, image_path_thumbnail */ } = await obtenerGenerarArchivoSupabase(archivo.id);  //Todas las imágenes guardadas son JPG a la resolución original.... 
            //         const { /* data: dataUpdateImages,*/ error: errorUpdateImages } = await supabase.from('product_images').insert([{ product_id: dataId, image_path /*, image_path_catalog, image_path_thumbnail */, is_primary: idx === 0 }]);

            //         if (errorUpdateImages) {
            //             console.log("Error al insertar PRODUCT_IMAGE en SUPABASE", errorUpdateImages);
            //             // throw new AppError("Error al insertar en SUPABASE", 500);
            //         }
            //     });

            // } catch (error) {
            //     console.log(">>>>>>>>>>>>>>>>>", { archivos, error });
            // }

            // try {
            //     // if validacion is not an array, convert it to an array
            //     const productoValidadoArray = Array.isArray(productoValidado) ? productoValidado : [productoValidado];
            //     productoValidadoArray?.forEach(async validacion => {
            //         // if element is null or undefined, skip it
            //         if (!validacion) return;

            //         const { error: errorProductValidation } = await supabase.from('product_validations').insert([{ product_id: dataId, validation: convertValidation(validacion.validacion) }]);
            //         if (errorProductValidation) {
            //             console.log("Error al insertar PRODUCT_VALIDATION en SUPABASE", errorProductValidation);
            //             // throw new AppError("Error al insertar en SUPABASE", 500);
            //         }
            //     });
            // } catch (error) {
            //     console.log(">>>>>>>>>>>>>>>>>", { productoValidado, error });
            // }


            // Se Obtienen los Inventarios y Comentarios
            // const { productoInventarios, comentarios } = await getRepository(Producto).findOneOrFail(id, { relations: ['productoInventarios', 'comentarios'] });

            // try {
            //     // Agrego Comentarios a SUPABASE
            //     // console.log("comentarios", comentarios);
            //     comentarios?.forEach(async comentario => {
            //         const { data: dataUser, error: errorUser } = await supabase.from('users').select().eq('old_id', comentario.sesion.usuario.id).single();
            //         if (errorUser) {
            //             console.log("Error al insertar USER en SUPABASE", errorUser);
            //             // throw new AppError("Error al insertar en SUPABASE", 500);
            //         }
            //         const { data: dataCommnet, error: errorComment } = await supabase.from('comments').insert([{ comment: comentario.comentario, created_at: comentario.fecha, updated_at: comentario.fecha, user_id: dataUser.id }]).select();
            //         if (errorComment) {
            //             console.log("Error al insertar PRODUCT_COMMENT en SUPABASE", errorComment);
            //             // throw new AppError("Error al insertar en SUPABASE", 500);
            //         }

            //         const { error: errorProductComment } = await supabase.from('product_comments').insert([{ product_id: dataId, comment_id: dataCommnet[0].id }]);
            //         if (errorProductComment) {
            //             console.log("Error al insertar PRODUCT_COMMENT en SUPABASE", errorProductComment);
            //             // throw new AppError("Error al insertar en SUPABASE", 500);
            //         }
            //     });
            // } catch (error) {
            //     console.log(">>>>>>>>>>>>>>>>>", { comentarios, error });

            // }



            // try {
            //     // Agrego Inventarios a SUPABASE
            //     productoInventarios?.forEach(async productoInventario => {
            //         const { data: dataUser, error: errorUser } = await supabase.from('users').select().eq('old_id', productoInventario.sesion.usuario.id).single();
            //         if (errorUser) {
            //             console.log("Error al insertar USER en SUPABASE", errorUser);
            //         }

            //         const { error: errorProductInventory } = await supabase
            //             .from('product_inventories')
            //             .insert([{
            //                 product_id: dataId,
            //                 created_at: productoInventario.fecha,
            //                 updated_at: productoInventario.fecha,
            //                 note: productoInventario.nombre,
            //                 inventory_status: convertInventoryStatus(productoInventario.validacion),
            //                 user_id: dataUser.id,
            //             }]);
            //         if (errorProductInventory) {
            //             console.log("Error al insertar PRODUCT_INVENTORY en SUPABASE", errorProductInventory);
            //         }
            //     });
            // } catch (error) {
            //     console.log(">>>>>>>>>>>>>>>>>", { productoInventarios, error });

            // }

            // console.log("Updated Record", { oldId: id, newId: dataId });
            res.json({
                oldId: id,
                // newId: dataId 
            });


        } catch (error) {
            next(error)

        }
    }

    // obtenerId
    static obtenerId = async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        try {
            const resp = await CommonController.obtenerIdQuery(
                fnQueryId(id)
            )

            // if resp is undefined thrown a 404 error
            if (resp === undefined) {
                throw new AppError("No se encontró el registro", 404);
            }

            console.log("inventario Actual obtenerId", resp)

            // // console.log("Get Inventory By ID", { oldId: id, newId: data[0].id, dataLen: data.length });
            // console.log("Updated Record", { oldId: id, newId: data.id });
            res.json(resp);
        } catch (error) {
            next(error)
        }
    }

    // editar
    static editar = async (req: Request, res: Response, next: NextFunction) => {
        const {
            bodegaId,
            inventarioActualId,
            ...body } = req.body;
        const { jwtPayload } = res.locals;
        try {
            const inventarioActual = await getRepository(InventarioActual).findOneOrFail(idSeguro(inventarioActualId, "inventarioActualId"), { relations: ["bodega"] });
            inventarioActual.bodega = await getRepository(Bodega).findOneOrFail(idSeguro(bodegaId, "bodegaId"));
            // cantidad, cantidadAlmacen y disponible solo cambian con movimientos (hallazgo H6)
            const resp = await CommonController.editarConRegistro(
                getRepository(InventarioActual),
                inventarioActual,
                body,
                jwtPayload.si,
                ["fechaDisponibilidad"]
            );

            res.json(resp);
        } catch (error) {
            next(error);
        }

    }

    // busqueda Catalogo general (todo excepto bajas)
    static busquedaCatalogoGeneral = async (req: Request, res: Response, next: NextFunction) => {
        const {
            pagination,
            ...body } = req.body;
        try {
            const page = pagination.current ? pagination.current : 1;
            const { pageSize } = pagination;
            const starts = pageSize * page - pageSize;

            const qry = queryBusquedaCatalogo(body);
            const conteoTotal = await qry.getCount();
            qry.skip(starts).take(pageSize);

            const qryResult = await qry.getMany();

            const respuesta: ResultadoTabla = {
                results: qryResult,
                filtered: qryResult.length,
                pagination: {
                    current: page,
                    pageSize,
                    total: conteoTotal,
                    totalItems: conteoTotal,
                }
            }
            res.json(respuesta);
        } catch (error) {
            next(error)
        }

    }
    // busqueda Catalogo por codigo (todo)
    static busquedaCatalogoCodigo = async (req: Request, res: Response, next: NextFunction) => {
        const {
            pagination,
            codigosBusqueda } = req.body;
        try {
            const codigos: string[] = (Array.isArray(codigosBusqueda) ? codigosBusqueda : String(codigosBusqueda ?? "").split('\n'))
                .map((c) => String(c).trim())
                .filter((c) => c.length > 0);
            if (codigos.length === 0)
                throw new AppError("Codigos indefinidos", 400);

            const page = pagination.current ? pagination.current : 1;
            const { pageSize } = pagination;
            const starts = pageSize * page - pageSize;

            const qry = queryBusquedaCodigos(codigos);
            const conteoTotal = await qry.getCount();

            qry.skip(starts).take(pageSize);
            const qryResult = await qry.getMany();

            const respuesta: ResultadoTabla = {
                results: qryResult,
                filtered: qryResult.length,
                pagination: {
                    current: page,
                    pageSize,
                    total: conteoTotal,
                    totalItems: conteoTotal,
                }
            }
            res.json(respuesta);
        } catch (error) {
            next(error)
        }
    }

    // busqueda Catalogo general solo bajas
    static busquedaCatalogoBajas = async (req: Request, res: Response, next: NextFunction) => {
        const {
            pagination,
            ...body } = req.body;
        try {
            const page = pagination.current ? pagination.current : 1;;
            const { pageSize } = pagination;
            const starts = pageSize * page - pageSize;

            const qry = queryBusquedaCatalogo({ ...body, estados: [InventarioDisponible.BAJA] });
            const conteoTotal = await qry.getCount();
            qry.skip(starts).take(pageSize);

            const qryResult = await qry.getMany();

            const respuesta: ResultadoTabla = {
                results: qryResult,
                filtered: qryResult.length,
                pagination: {
                    current: page,
                    pageSize,
                    total: conteoTotal,
                    totalItems: conteoTotal,
                }
            }
            res.json(respuesta);
        } catch (error) {
            next(error)
        }
    }

    // busqueda Catalogo por proyecto
    static busquedaCatalogoProyecto = async (req: Request, res: Response, next: NextFunction) => {
        const {
            pagination,
            ...body } = req.body;
        try {
            const page = pagination.current ? pagination.current : 1;
            const { pageSize } = pagination;
            const starts = pageSize * page - pageSize;

            const qry = queryBusquedaProyecto(body);
            const conteoTotal = await qry.getCount();
            qry.skip(starts).take(pageSize);

            const qryResult = await qry.getMany();

            const respuesta: ResultadoTabla = {
                results: qryResult,
                filtered: qryResult.length,
                pagination: {
                    current: page,
                    pageSize,
                    total: conteoTotal,
                    totalItems: conteoTotal
                }
            }
            res.json(respuesta);
        } catch (error) {
            next(error)
        }
    }



    // TODO busqueda Catalogo por factura sistema viejo... y actual?
    static busquedaCatalogoFacturas = async (req: Request, res: Response, next: NextFunction) => {
        // Pendiente de implementar (búsqueda por factura/proveedor). Antes la petición se quedaba colgada (hallazgo H9).
        next(new AppError("Búsqueda por facturas no implementada", 501));
    }

    // TODO SE PODRÍA HACER QUE TODAS LAS LISTAS SE MUESTREN EN FORMA DE CATALOGO???


    // #Factura Original

    // obtener ultimo Movimiento --> esta en Movimientos

    // obtener ultima vez Inventariado
    // -8	BAJA EN INVENTARIO	activo
    // -9	INVENTARIO	activo
    // -6	AJUSTE INVENTARIO	activo
    static obtenerMovimientosInventario = async (req: Request, res: Response, next: NextFunction) => {
        // La ruta es POST sin :id; el id viene en el body (hallazgo H10). Se acepta también en params por compatibilidad.
        const id = idSeguro(req.body?.inventarioActualId ?? req.params?.id, "inventarioActualId");

        try {
            res.json(
                await getRepository(Operacion)
                    .createQueryBuilder("operacion")
                    .innerJoin("operacion.movimientoTipo", "movimientoTipo")
                    .innerJoin("operacion.movimiento", "movimiento")
                    .innerJoin("movimiento.inventarioActual", "inventarioActual")
                    .where("movimientoTipo.id in (6,8,9)")
                    .andWhere("inventarioActual.id = :id", { id })
                    .orderBy("operacion.id", "DESC")
                    .getMany()
            )
        } catch (error) {
            next(error);

        }
    }

};

export default InventarioActualController;
export { crearBaseInventarioActual, queryBusquedaCatalogo, queryBusquedaCodigos, queryBusquedaProyecto };

function convertAviability(disponible: any): string {
    switch (disponible) {
        case InventarioDisponible.DISPONIBLE:
            return 'available';
        case InventarioDisponible.NO_DISPONIBLE:
            return 'not-available';
        case InventarioDisponible.BAJA:
            return 'rid';
        case InventarioDisponible.CUARENTENA:
            return 'quarantine';
        default:
            return 'unknown';
    }
}

function convertInventoryStatus(validacion: any): string {
    switch (validacion) {
        case InventarioEstado.INVENTARIO_POSITIVO:
            return 'positive';
        case InventarioEstado.INVENTARIO_NEGATIVO:
            return 'negative';
        default:
            return 'not-reviewed';
    }
}


function convertValidation(validacion: any): string {
    switch (validacion) {
        case ValidacionEstado.VALIDO:
            return 'valid';
        case ValidacionEstado.INVALIDO:
            return 'invalid';
        default:
            return 'not-reviewed';
    }
}