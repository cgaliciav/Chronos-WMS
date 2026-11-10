/**
 * Hallazgo L2: la contraseña que llega por correo es temporal. Con ella el usuario solo puede cambiarla; vence a las
 * `HORAS_PASSWORD_TEMPORAL` horas; al cambiarla recibe un token normal.
 */
import "./env";
import { Express } from "express";
import supertest from "supertest";
import { crearApp } from "../app";
import { AppDataSource } from "../data-source";
import EnviarMail from "../helpers/enviarMail";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, nombreUnico } from "./factories";
import { SEMILLA } from "./seed";

describe("L2 · contraseña temporal con cambio obligatorio", () => {
  let app: Express;
  let admin: ReturnType<typeof clienteAdmin>;
  const enviados: { correo: string; password: string }[] = [];

  const login = (c: string, p: string) => supertest(app).post("/auth/login").send({ c, p });
  const con = (token: string) => ({
    get: (ruta: string) => supertest(app).get(ruta).set("auth", token),
    put: (ruta: string, cuerpo: object) => supertest(app).put(ruta).set("auth", token).send(cuerpo),
  });
  /** Da de alta un usuario y devuelve su correo y la contraseña temporal que se envió por correo. */
  const altaUsuario = async () => {
    const correo = `${nombreUnico("u").toLowerCase()}@pruebas.local`;
    const res = await admin.post("/user/new").send({
      nombre: "Usuario temporal",
      correo,
      vencimiento: "2030-01-01",
      rolesIds: [],
      proyectosIds: [SEMILLA.proyectoAId],
      bodegasIds: [SEMILLA.bodegaId],
      areasIds: [SEMILLA.areaId],
    });
    expect(res.status).toBe(200);
    const envio = enviados.find((e) => e.correo === correo);
    expect(envio).toBeDefined();
    return { correo, temporal: envio!.password };
  };

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    admin = clienteAdmin(app);
    const capturar = (correo: string, password: string) => void enviados.push({ correo, password });
    jest.spyOn(EnviarMail, "correoNuevoUsuario").mockImplementation(capturar);
    jest.spyOn(EnviarMail, "correoNuevoPassword").mockImplementation(capturar);
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await cerrarPruebas();
  });

  it("con la temporal solo se puede cambiar la contraseña; después el token es normal", async () => {
    const { correo, temporal } = await altaUsuario();

    const entrada = await login(correo, temporal);
    expect(entrada.status).toBe(200);
    expect(entrada.body).toEqual({ t: expect.any(String), cambiarPassword: true });
    const restringido = con(entrada.body.t);

    // Cualquier otra ruta: 403 con `cambiarPassword: true`
    const bloqueada = await restringido.get("/notifications/count");
    expect(bloqueada.status).toBe(403);
    expect(bloqueada.body).toMatchObject({ cambiarPassword: true, message: expect.stringMatching(/cambiar tu contraseña temporal/) });
    expect((await restringido.get(`/file/thumbnail/1?auth=${entrada.body.t}`)).status).toBe(403);

    // Su cuenta sí (el front la carga al arrancar) y dice que debe cambiarla
    const cuenta = await restringido.get("/user/current");
    expect(cuenta.status).toBe(200);
    expect(cuenta.body).toMatchObject({ correo, cambiarPassword: true });
    expect(cuenta.body).not.toHaveProperty("debeCambiarPassword");

    // No vale repetir la temporal ni una actual equivocada
    expect((await restringido.put("/user/password", { pa: temporal, pn: temporal })).status).toBe(406);
    expect((await restringido.put("/user/password", { pa: "Otra1234", pn: "Nueva1234" })).status).toBe(403);

    const cambio = await restringido.put("/user/password", { pa: temporal, pn: "Nueva1234" });
    expect(cambio.status).toBe(200);
    expect(cambio.body.t).toEqual(expect.any(String));
    expect(cambio.headers.t).toBe(cambio.body.t);
    const normal = con(cambio.body.t);
    expect((await normal.get("/notifications/count")).status).toBe(200);
    expect((await normal.get("/user/current")).body).not.toHaveProperty("cambiarPassword");

    // La temporal ya no sirve y la nueva entra sin restricciones
    expect((await login(correo, temporal)).status).toBe(401);
    const otraVez = await login(correo, "Nueva1234");
    expect(otraVez.body).toEqual({ t: expect.any(String) });
  });

  it("la contraseña temporal vencida no permite entrar", async () => {
    const { correo, temporal } = await altaUsuario();
    await AppDataSource.query("UPDATE usuario SET vencePasswordTemporal = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE correo = ?", [correo]);
    const res = await login(correo, temporal);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/temporal venció/);
  });

  it("regenerar la contraseña (administrador) vuelve a exigir el cambio", async () => {
    const { correo, temporal } = await altaUsuario();
    const primera = await login(correo, temporal);
    expect((await con(primera.body.t).put("/user/password", { pa: temporal, pn: "Propia123" })).status).toBe(200);

    const regenerada = await admin.put("/user/renewpassword").send({ email: correo });
    expect(regenerada.status).toBe(200);
    expect(regenerada.body).toEqual({ correo, enviado: true });
    const nueva = enviados.filter((e) => e.correo === correo).pop()!.password;
    expect(nueva).not.toBe(temporal);
    expect((await login(correo, "Propia123")).status).toBe(401);
    expect((await login(correo, nueva)).body.cambiarPassword).toBe(true);
  });

  it("las cuentas existentes no cambian: el administrador entra con un token normal", async () => {
    const res = await login(SEMILLA.adminCorreo, SEMILLA.adminPassword);
    expect(res.body).toEqual({ t: expect.any(String) });
  });
});
