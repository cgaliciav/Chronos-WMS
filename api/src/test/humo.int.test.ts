import "./env";
import { Express } from "express";
import supertest from "supertest";
import { crearApp } from "../app";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin } from "./factories";
import { SEMILLA } from "./seed";

describe("humo: la aplicación arranca contra MariaDB de pruebas", () => {
  let app: Express;

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
  });
  afterAll(cerrarPruebas);

  it("GET / devuelve nombre y versión", async () => {
    const res = await supertest(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "almacen-api", version: expect.any(String) });
  });

  it("POST /auth/login entrega un token y crea sesión", async () => {
    const res = await supertest(app).post("/auth/login").send({ c: SEMILLA.adminCorreo, p: SEMILLA.adminPassword });
    expect(res.status).toBe(200);
    expect(res.body.t).toEqual(expect.any(String));
  });

  it("POST /auth/login rechaza contraseña incorrecta", async () => {
    const res = await supertest(app).post("/auth/login").send({ c: SEMILLA.adminCorreo, p: "mala" });
    expect(res.status).toBe(401);
  });

  it("GET /user/current exige token", async () => {
    const sinToken = await supertest(app).get("/user/current");
    expect(sinToken.status).toBe(401);
    const conToken = await clienteAdmin(app).get("/user/current");
    expect(conToken.status).toBe(200);
    expect(conToken.body.correo).toBe(SEMILLA.adminCorreo);
    expect(conToken.body.roles).toContain("ADMINISTRADOR");
  });

  it("checkRole bloquea a quien no tiene el rol", async () => {
    const { clienteOperador } = await import("./factories");
    const res = await clienteOperador(app).get("/area/list-names");
    expect(res.status).toBe(401);
  });
});
