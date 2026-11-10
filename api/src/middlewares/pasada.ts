import { Request, Response, NextFunction } from "express";
import { logger, ocultarToken } from "../helpers/logger";

export const pasadas = (req: Request, res: Response, next: NextFunction) => {
  const { ip, originalUrl, method } = req;
  logger.debug(`${method} ${ocultarToken(originalUrl)} ${ip}`); // el registro por petición completo lo hace pino-http (index.ts)

  //Call the next middleware or controller
  next();
};
