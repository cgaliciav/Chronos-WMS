import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { LogPeticiones } from "../entity/LogPeticiones";
import { logger } from "../helpers/logger";

/**
 * Guarda una fila en LogPeticiones por cada petición terminada (sustituye a `request-stats`, plan 02 fase 4).
 * Solo lo activa `src/index.ts`; las pruebas no lo usan.
 */
export const registrarPeticiones = (req: Request, res: Response, next: NextFunction) => {
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const registro = new LogPeticiones();
    registro.ok = res.statusCode < 400;
    registro.time = Number((process.hrtime.bigint() - inicio) / BigInt(1_000_000));
    registro.reqMethod = req.method;
    registro.reqPath = (req.originalUrl ?? req.url).split("?")[0].slice(0, 255);
    registro.reqIp = (req.ip ?? "").slice(0, 255);
    registro.reqBytes = Number(req.headers["content-length"] ?? 0) || 0;
    registro.resBytes = Number(res.getHeader("content-length") ?? 0) || 0;
    registro.resStatus = res.statusCode;
    AppDataSource.getRepository(LogPeticiones)
      .save(registro)
      .catch((error) => logger.error("No se pudo guardar LogPeticiones", error.message));
  });
  next();
};
