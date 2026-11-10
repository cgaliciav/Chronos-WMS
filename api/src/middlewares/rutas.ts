import { NextFunction, Request, Response } from "express";
import { parametro } from "../helpers/ids";

/**
 * Sustituye a `:id([0-9]+)` de Express 4: path-to-regexp 8 (Express 5) ya no admite expresiones en los parámetros.
 * Si el parámetro no es numérico, `next("route")` deja que lo intenten las rutas siguientes; si ninguna casa,
 * Express responde su 404, como antes.
 */
export const soloDigitos = (nombre: string) => (req: Request, _res: Response, next: NextFunction) => {
  if (/^\d+$/.test(parametro(req, nombre))) next();
  else next("route");
};
