import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";

import { Usuario } from "../entity/Usuario";
import { ModoVisibilidad } from "../entity/common/ModoVisibilidad";
import { AppError } from "../helpers/errorClases";
import { Alcance } from "../services/alcance";

/**
 * El usuario con sus relaciones a-muchos. QueryBuilder y no `findOneOrFail`: en TypeORM 1.x `findOne` con relaciones
 * a-muchos añade LIMIT 1 y una consulta previa `SELECT DISTINCT` (dos consultas por llamada, en cada petición).
 */
const usuarioCon = (id: number, relaciones: ("roles" | "areas" | "bodegas" | "proyectos")[]) => {
  const qb = AppDataSource.getRepository(Usuario).createQueryBuilder("usuario").select(["usuario.id", "usuario.modoVisibilidad"]).where("usuario.id = :id", { id });
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
      if (user.roles.some((r) => roles.indexOf(r.codigoRol) >= 0)) {
        const { areas, bodegas, proyectos } = await usuarioCon(jwtPayload.ui, ["areas", "bodegas", "proyectos"]);

        res.locals.usuarioAreas = areas.map((area) => area.id);
        res.locals.usuarioBodegas = bodegas.map((bodega) => bodega.id);
        res.locals.usuarioProyectos = proyectos.map((proyecto) => proyecto.id);
        // Alcance de datos (decisión 21). El rol ADMINISTRADOR ignora el modo de visibilidad.
        const esAdministrador = user.roles.some((r) => r.codigoRol === "ADMINISTRADOR");
        const alcance: Alcance = {
          modo: esAdministrador ? ModoVisibilidad.GENERAL : (user.modoVisibilidad ?? ModoVisibilidad.GENERAL),
          usuarioId: Number(jwtPayload.ui),
          proyectos: res.locals.usuarioProyectos,
        };
        res.locals.alcance = alcance;

        next();
      } else {
        throw new AppError("Usuario sin autorización", 401);
      }
    } catch (error) {
      next(error);
    }
  };
