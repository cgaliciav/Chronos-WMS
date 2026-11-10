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

/**
 * Une las barras repetidas de la ruta (`//file/thumbnail/1` → `/file/thumbnail/1`); no toca la consulta (`?…`).
 * Express 4 casaba esas rutas; path-to-regexp 8 (Express 5) no, y respondía 404. El front hasta v4.2.1 pide
 * `${apiURLBase}/file/…` con `apiURLBase` terminado en `/` (miniaturas de los listados y subida de archivos): sin esto,
 * esos builds dejan de ver miniaturas y de subir archivos contra un API con Express 5.
 */
export const unirBarrasRepetidas = (req: Request, _res: Response, next: NextFunction) => {
  const inicioConsulta = req.url.indexOf("?");
  const ruta = inicioConsulta === -1 ? req.url : req.url.slice(0, inicioConsulta);
  if (ruta.includes("//")) {
    req.url = ruta.replace(/\/{2,}/g, "/") + (inicioConsulta === -1 ? "" : req.url.slice(inicioConsulta));
  }
  next();
};
