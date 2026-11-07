import { Request, Response, NextFunction } from "express";

export const pasadas = (req: Request, res: Response, next: NextFunction) => {
  const { route, ip, originalUrl, headers,method } = req;
  // req.route;
  // req.ip;
  // req.originalUrl;
  const fwd = headers["x-forwarded-for'"] ?? "-";
  console.log(`${new Date().toLocaleString()}--${method}--${originalUrl}`);

  //Call the next middleware or controller
  next();
};
