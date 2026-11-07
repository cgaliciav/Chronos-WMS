import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Rol } from "../entity/Rol";
import CommonController from "./common/Common.Controller";



// const BusquedaListaSimpleCompleta = async (camposSelect:string[],busqueda:string="")=>{

//   const options:FindManyOptions<Rol>={
//     select:camposSelect.map(cs=>cs as (keyof Rol))
//   }

//   if(busqueda.length>0)
//     options.where={nombre:Like(`%${busqueda}%`)}

//   return getRepository(Rol).find({
//     select:["id","nombre"],
//     where:{nombre:Like(`%${busqueda}%`) }
//   })
// }

class RolController{

  static listaSimple = (req: Request, res: Response, next: NextFunction) =>{
    CommonController.listaSimple(
        getRepository(Rol),
        ["id","nombre","codigoRol"]
    )
    .then(lista => {
        res.json(lista);
    })
    .catch(error => next(error) );
  }

  static listaSimpleCompletaDinamica = async (req: Request, res: Response, next: NextFunction) => {
    const {busqueda}= req.body;
    try {
      res.json(await CommonController.BusquedaListaSimpleCompleta(
        getRepository(Rol),
        ["id","nombre"],
        busqueda) 
        );
    } catch (error) { 
      next (error);
    }
  }


}

export default RolController;