import { Request } from "express";

jest.mock("../controllers/LogGeneral.Controller", () => ({
  __esModule: true,
  default: { InsertarLog: jest.fn() },
}));

import LogGeneralController from "../controllers/LogGeneral.Controller";
import { AppError } from "../helpers/errorClases";
import { errorMiddlewere } from "./manejoErrores";

const reqFalsa = () => ({ path: "/x", body: {}, params: {}, headers: {}, ip: "127.0.0.1" } as unknown as Request);
const resFalsa = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("errorMiddlewere", () => {
  beforeEach(() => jest.clearAllMocks());

  it("responde con el statusCode y el mensaje de un AppError y registra el log", () => {
    const res = resFalsa();
    errorMiddlewere(new AppError("No existe", 404), reqFalsa(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ code: "Recurso no encontrado", message: "No existe" });
    expect(LogGeneralController.InsertarLog).toHaveBeenCalledTimes(1);
  });

  it("convierte errores genéricos en 500", () => {
    const res = resFalsa();
    errorMiddlewere(new Error("boom"), reqFalsa(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ code: "Error", message: "boom" });
  });

  it("traduce ER_DUP_ENTRY a un mensaje legible", () => {
    const res = resFalsa();
    const err: any = new Error("Duplicate entry");
    err.code = "ER_DUP_ENTRY";
    errorMiddlewere(err, reqFalsa(), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Registro duplicado, por favor reintenta con nuevos valores" })
    );
  });

  it("renombra EntityNotFound como REGISTRO NO ENCONTRADO", () => {
    const res = resFalsa();
    const err: any = new Error("Could not find any entity");
    err.name = "EntityNotFound";
    errorMiddlewere(err, reqFalsa(), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "REGISTRO NO ENCONTRADO" }));
  });

  it("añade el detalle de un AppError (p. ej. candidatas de un 409) sin dejar que pise code ni message", () => {
    const res = resFalsa();
    errorMiddlewere(new AppError("Elige", 409, { candidatas: [{ movimientoId: 1 }], message: "otro" }), reqFalsa(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ code: "Conflicto", message: "Elige", candidatas: [{ movimientoId: 1 }] });
  });
});
