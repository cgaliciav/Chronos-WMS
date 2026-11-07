import { Request, Response, NextFunction } from "express";

export const pasadas = (req: Request, res: Response, next: NextFunction) => {
  const { ip, originalUrl, method } = req;
  // req.route;
  // req.ip;
  // req.originalUrl;
  if (process.env.NODE_ENV !== "test") {
    console.log(`${new Date().toLocaleString()}--${method}--${originalUrl}--${ip}`);
  }

  //Call the next middleware or controller
  next();
};
