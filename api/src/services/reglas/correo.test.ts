import { POR_DEFECTO } from "../../esquemas/configuracion";
import { elegirTransporte, PLANTILLAS_POR_DEFECTO, plantillaDe, remitente, renderizar } from "./correo";

describe("reglas de correo (plan 03, fase 2)", () => {
  it("renderizar sustituye variables como texto plano; las que faltan quedan vacías", () => {
    expect(renderizar("Hola {{correo}}, {{ nombreApp }}{{nada}}!", { correo: "a@b.mx", nombreApp: "Chronos WMS" })).toBe("Hola a@b.mx, Chronos WMS!");
    expect(renderizar("{{x}}", { x: "${process.exit()}" })).toBe("${process.exit()}");
  });

  it("las plantillas del producto solo usan variables admitidas y dicen Chronos WMS por la variable", () => {
    const todo = Object.values(PLANTILLAS_POR_DEFECTO).map((p) => p.asunto + p.cuerpo).join(" ");
    expect(todo).toMatch(/\{\{nombreApp\}\}/);
    expect(todo).not.toMatch(/sony|teleset/i);
  });

  it("la plantilla del cliente sustituye a la del producto", () => {
    const correo = { ...POR_DEFECTO.correo, plantillas: { alerta: { asunto: "A {{alerta}}", cuerpo: "C" } } };
    expect(plantillaDe(correo, "alerta").asunto).toBe("A {{alerta}}");
    expect(plantillaDe(correo, "nuevoUsuario")).toBe(PLANTILLAS_POR_DEFECTO.nuevoUsuario);
  });

  it("remitente con nombre entre comillas", () => {
    expect(remitente('Almacén "Demo"', "envios@demo.mx")).toBe('"Almacén Demo" <envios@demo.mx>');
  });

  it("SMTP_ANULAR gana sobre la BD y no lleva credenciales; luego la BD; luego SMTP_*", () => {
    const correo = { ...POR_DEFECTO.correo, transporte: { host: "smtp.real.io", puerto: 465, seguro: true, usuario: "u", cabeceras: { "X-Stream": "o" } } };
    expect(elegirTransporte(correo, "clave", { SMTP_ANULAR: "mailpit:1025" })).toEqual({
      tipo: "anulado",
      opciones: { host: "mailpit", port: 1025, secure: false, ignoreTLS: true },
    });
    expect(elegirTransporte(correo, "clave", {})).toEqual({
      tipo: "bd",
      opciones: { host: "smtp.real.io", port: 465, secure: true, auth: { user: "u", pass: "clave" } },
      cabeceras: { "X-Stream": "o" },
    });
    const entorno = elegirTransporte(POR_DEFECTO.correo, null, { SMTP_HOST: "smtp.env.io", SMTP_PORT: "2525", SMTP_USER: "e" });
    expect(entorno).toMatchObject({ tipo: "entorno", opciones: { host: "smtp.env.io", port: 2525, auth: { user: "e" } } });
  });
});
