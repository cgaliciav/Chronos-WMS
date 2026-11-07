import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppError } from "../helpers/errorClases";
// import config from "../config/config";

interface jwtPaylodType{
  ui:number,
  u:string,
  si:number
}

/** Duración de los tokens (login y renovación). Antes: 12 h en login y 90 d en la renovación que nunca se enviaba. */
export const DURACION_TOKEN = "12h";

export const firmarToken = (payload: jwtPaylodType) => jwt.sign(payload, process.env.JWTSECRET, { expiresIn: DURACION_TOKEN });

const verificarYRenovar = (token: string | undefined, res: Response) => {
  if (!token) {
    throw new AppError("Token requerido", 401);
  }
  const jwtPayload = jwt.verify(token, process.env.JWTSECRET, { algorithms: ["HS256"] }) as jwtPaylodType;
  res.locals.jwtPayload = jwtPayload;
  const { ui, u, si } = jwtPayload;
  // Se renueva el token en cada petición y se envía el NUEVO en la cabecera `t` (antes se enviaba el viejo).
  res.setHeader("Access-Control-Expose-Headers", "t");
  res.setHeader("t", firmarToken({ ui, u, si }));
};

/** Cabecera `auth`. Un JWT inválido o ausente responde 401. */
export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  try {
    verificarYRenovar(req.headers["auth"] as string | undefined, res);
    next();
  } catch (error) {
    next(error.name === "JsonWebTokenError" || error.name === "TokenExpiredError" ? new AppError("Token inválido", 401) : error);
  }
};

/**
 * Para recursos que el navegador pide sin cabeceras (`<img src>`, descargas): acepta el token en la
 * cabecera `auth` o en el parámetro de consulta `?auth=`. Si `ARCHIVOS_PUBLICOS=true` (transición
 * hasta que el front envíe el token en las URLs de imagen) deja pasar sin token.
 */
export const checkJwtArchivos = (req: Request, res: Response, next: NextFunction) => {
  const token = (req.headers["auth"] as string | undefined) ?? (typeof req.query.auth === "string" ? req.query.auth : undefined);
  if (!token && process.env.ARCHIVOS_PUBLICOS === "true") {
    return next();
  }
  try {
    verificarYRenovar(token, res);
    next();
  } catch (error) {
    next(error.name === "JsonWebTokenError" || error.name === "TokenExpiredError" ? new AppError("Token inválido", 401) : error);
  }
};