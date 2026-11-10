import { Request, Response } from "express";
import { unirBarrasRepetidas } from "./rutas";

const pasar = (url: string) => {
  const req = { url } as Request;
  const next = jest.fn();
  unirBarrasRepetidas(req, {} as Response, next);
  expect(next).toHaveBeenCalledTimes(1);
  return req.url;
};

describe("unirBarrasRepetidas", () => {
  it("une las barras repetidas de la ruta", () => {
    expect(pasar("//file/thumbnail/12")).toBe("/file/thumbnail/12");
    expect(pasar("/file///file")).toBe("/file/file");
  });

  it("conserva la consulta tal cual, aunque lleve barras", () => {
    expect(pasar("//file/thumbnail/12?auth=a.b.c&r=http://x//y")).toBe("/file/thumbnail/12?auth=a.b.c&r=http://x//y");
  });

  it("no cambia las rutas normales", () => {
    expect(pasar("/groups/list-antd?x=1")).toBe("/groups/list-antd?x=1");
    expect(pasar("/")).toBe("/");
  });
});
