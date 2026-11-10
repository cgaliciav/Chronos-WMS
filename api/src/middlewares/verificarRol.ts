import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";

import { Usuario } from "../entity/Usuario";
import { AppError } from "../helpers/errorClases";

/**
 * El usuario con sus relaciones a-muchos. QueryBuilder y no `findOneOrFail`: en TypeORM 1.x `findOne` con relaciones
 * a-muchos añade LIMIT 1 y una consulta previa `SELECT DISTINCT` (dos consultas por llamada, en cada petición).
 */
const usuarioCon = (id: number, relaciones: ("roles" | "areas" | "bodegas" | "proyectos")[]) => {
  const qb = AppDataSource.getRepository(Usuario).createQueryBuilder("usuario").select("usuario.id").where("usuario.id = :id", { id });
  for (const relacion of relaciones) qb.leftJoinAndSelect(`usuario.${relacion}`, relacion);
  return qb.getOneOrFail();
};

export const checkRole =
  (roles: Array<string>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    try {
      // cargamos roles, areas, bodegas y proyectos relacionadas con el usuario.
      const user = await usuarioCon(jwtPayload.ui, ["roles"]);
      // console.log("**********USUARIO ROLES",user.roles);
      // console.log("**********ROLES",roles);
      if (user.roles.some((r) => roles.indexOf(r.codigoRol) >= 0)) {
        const { areas, bodegas, proyectos } = await usuarioCon(jwtPayload.ui, ["areas", "bodegas", "proyectos"]);

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
