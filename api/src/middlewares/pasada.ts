import { Request, Response, NextFunction } from "express";
import { logger } from "../helpers/logger";

export const pasadas = (req: Request, res: Response, next: NextFunction) => {
  const { ip, originalUrl, method } = req;
  // req.route;
  // req.ip;
  // req.originalUrl;
  logger.debug(`${method} ${originalUrl} ${ip}`); // el registro por petición completo lo hace pino-http (index.ts)

  //Call the next middleware or controller
  next();
};
