import { correoEntradaSchema, ESQUEMAS, POR_DEFECTO, SECCIONES, variablesDe } from "./configuracion";

describe("esquemas de configuración (plan 03 §2.1)", () => {
  it("los valores por defecto validan", () => {
    for (const s of SECCIONES) expect(ESQUEMAS[s].safeParse(POR_DEFECTO[s]).success).toBe(true);
  });

  it("campos desconocidos se rechazan (.strict)", () => {
    expect(ESQUEMAS.marca.safeParse({ ...POR_DEFECTO.marca, extra: 1 }).success).toBe(false);
    expect(ESQUEMAS.regional.safeParse({ ...POR_DEFECTO.regional, x: true }).success).toBe(false);
  });

  it("valida colores, URLs y la moneda por defecto", () => {
    const tema = { ...POR_DEFECTO.marca.tema, colorPrimario: "azul" };
    expect(ESQUEMAS.marca.safeParse({ ...POR_DEFECTO.marca, tema }).success).toBe(false);
    expect(ESQUEMAS.marca.safeParse({ ...POR_DEFECTO.marca, avisoPrivacidadUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(ESQUEMAS.regional.safeParse({ ...POR_DEFECTO.regional, monedaPorDefecto: "EUR" }).success).toBe(false);
  });

  it("plantillas: solo variables conocidas", () => {
    expect(variablesDe("Hola {{correo}}, clave {{ clave }}")).toEqual(["correo", "clave"]);
    const ok = { ...POR_DEFECTO.correo, plantillas: { alerta: { asunto: "{{nombreApp}} - alerta", cuerpo: "{{alerta}}" } } };
    expect(ESQUEMAS.correo.safeParse(ok).success).toBe(true);
    const mal = { ...POR_DEFECTO.correo, plantillas: { alerta: { asunto: "x", cuerpo: "{{process}}" } } };
    const r = ESQUEMAS.correo.safeParse(mal);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/Variables desconocidas: process/);
  });

  it("la entrada de correo acepta la contraseña en claro y no la cifrada", () => {
    const transporte = { host: "smtp.x.io", puerto: 587, seguro: false, usuario: "u", contrasena: "p" };
    expect(correoEntradaSchema.safeParse({ ...POR_DEFECTO.correo, transporte }).success).toBe(true);
    const cifrada = { ...transporte, contrasena: undefined, contrasenaCifrada: "v1:a:b:c" };
    expect(correoEntradaSchema.safeParse({ ...POR_DEFECTO.correo, transporte: cifrada }).success).toBe(false);
  });
});
