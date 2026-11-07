
import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { getRepository } from "typeorm";
import { Sesion } from "../entity/Sesion";
import { Usuario } from "../entity/Usuario";
import { AppError } from "../helpers/errorClases";
import {version, name} from "../../package.json" 
// import config from "../config/config";

const terminarSesion = async(sesionId:number) =>{
  const sesion = await getRepository(Sesion).findOneOrFail(sesionId);
  
  

  if(sesion.fechaFin===undefined || sesion.fechaFin===null ){
    sesion.fechaFin = new Date();
    await getRepository(Sesion).save(sesion);
  }

}

class AuthController {

  static login = async (req: Request, res: Response, next:NextFunction) => {
    
    let { c, p ,ip} = req.body;
    let usuario: Usuario;
    try {

      if (!(c && p)) {
        throw new AppError("Email o password inválidos",400);
      }

      usuario = await getRepository(Usuario).findOneOrFail({
        select:["id","nombre","correo","vencimiento","estatus","password"], 
        where: { correo: c },
        loadEagerRelations:false, 
        // cache:true,
      });

      if (!usuario.checkIfUnencryptedPasswordIsValid(p)) {
        throw new AppError("Usuario y/o contraseña incorrectos",401);
      }

      if(usuario.checkIfUserExpired() || !usuario.checkIfEnabled()){
        throw new AppError("Sin permiso. Contacta con tu administrador",401);
      }

      let sesion = new Sesion;
      sesion.usuario=usuario;
      
      sesion.IP=(ip===undefined)?"desconodida":ip;

      await getRepository(Sesion).save(sesion);

      const t = jwt.sign(
        { ui: usuario.id, u: usuario.nombre, si:sesion.id },
        process.env.JWTSECRET,
        { expiresIn: "12h" }
      );

      res.json({t});
    } catch (error) {
      next(error);
    }
  };

  static logout = async (req: Request, res: Response, next:NextFunction) => {
    const {jwtPayload} = res.locals;


    try {
      await terminarSesion(jwtPayload.si)

      res.json();
    
    } catch (error) {
      next(error);
    }

  };

  static version = async (req: Request, res: Response, next:NextFunction) => {
    res.json({
      name,
      version});
  }


}

export default AuthController;
// export {terminarSesion};
