
import { NextFunction, Request, Response } from "express";
import { firmarToken, olvidarSesion } from "../middlewares/verificarJwt";
import { AppDataSource } from "../data-source";
import { Sesion } from "../entity/Sesion";
import { Usuario } from "../entity/Usuario";
import { AppError } from "../helpers/errorClases";
import { nombrePaquete as name, versionPaquete as version } from "../helpers/paquete";
// import config from "../config/config";

const terminarSesion = async(sesionId:number) =>{
  const sesion = await AppDataSource.getRepository(Sesion).findOneByOrFail({ id: sesionId });
  
  

  if(sesion.fechaFin===undefined || sesion.fechaFin===null ){
    sesion.fechaFin = new Date();
    await AppDataSource.getRepository(Sesion).save(sesion);
  }
  olvidarSesion(sesionId); // el token deja de valer de inmediato (checkJwt consulta fechaFin)

}

class AuthController {

  static login = async (req: Request, res: Response, next:NextFunction) => {
    
    const { c, p } = req.body; // la IP ya no se toma del body (decisión 3c): viene de la conexión
    let usuario: Usuario;
    try {

      if (!(c && p)) {
        throw new AppError("Email o password inválidos",400);
      }

      usuario = await AppDataSource.getRepository(Usuario).findOneOrFail({
        select:{ id: true, nombre: true, correo: true, vencimiento: true, estatus: true, password: true }, 
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
      
      sesion.IP = (req.ip ?? "desconocida").slice(0, 50);

      await AppDataSource.getRepository(Sesion).save(sesion);

      const t = firmarToken({ ui: usuario.id, u: usuario.nombre, si: sesion.id });

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
