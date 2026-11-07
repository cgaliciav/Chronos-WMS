import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "../helpers/errorClases";

/**
 * Valida `req.body` con un esquema zod y lo reemplaza por el valor ya convertido (sin campos
 * desconocidos si el esquema es `strict`/`strip`). Responde 400 con los campos inválidos.
 */
export const validarBody =
  (esquema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const resultado = esquema.safeParse(req.body ?? {});
    if (!resultado.success) {
      const campos = Array.from(new Set(resultado.error.issues.map((i) => i.path.join(".") || "(body)")));
      return next(new AppError(`Error de validación en: ${campos.join(", ")}`, 400));
    }
    req.body = resultado.data;
    next();
  };
