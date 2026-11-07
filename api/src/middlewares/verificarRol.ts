import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";

import { Usuario } from "../entity/Usuario";
import { AppError } from "../helpers/errorClases";

export const checkRole =
  (roles: Array<string>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    try {
      // cargamos roles, areas, bodegas y proyectos relacionadas con el usuario.
      const user = await getRepository(Usuario).findOneOrFail(jwtPayload.ui, {
        select: ["id"],
        relations: ["roles"] /* cache:true*/,
      });
      // console.log("**********USUARIO ROLES",user.roles);
      // console.log("**********ROLES",roles);
      if (user.roles.some((r) => roles.indexOf(r.codigoRol) >= 0)) {
        const { areas, bodegas, proyectos } = await getRepository(
          Usuario
        ).findOneOrFail(jwtPayload.ui, {
          select: ["id"],
          relations: ["areas", "bodegas", "proyectos"],
        });

        res.locals.usuarioAreas = areas.map((area) => area.id);
        res.locals.usuarioBodegas = bodegas.map((bodega) => bodega.id);
        res.locals.usuarioProyectos = proyectos.map((proyecto) => proyecto.id);
        // console.log("checkRole >>>>>>>>>>>>>>>>>>> ",jwtPayload,{
        //   areas:res.locals.usuarioAreas,
        //   bodegas:res.locals.usuarioBodegas,
        //   proyectos:res.locals.usuarioProyectos
        // });

        next();
      } else {
        throw new AppError("Usuario sin autorización", 401);
      }
    } catch (error) {
      next(error);
    }
  };
