import { randomBytes } from "crypto";
import { cifrar, claveConfiguracion, descifrar } from "./cifrado";

describe("cifrado de secretos (plan 03 §2.3)", () => {
  const clave = randomBytes(32);

  it("cifra y descifra; cada cifrado es distinto (IV aleatorio)", () => {
    const a = cifrar("secreto-smtp", clave);
    const b = cifrar("secreto-smtp", clave);
    expect(a).toMatch(/^v1:/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("secreto-smtp");
    expect(descifrar(a, clave)).toBe("secreto-smtp");
  });

  it("con otra clave o manipulado no descifra", () => {
    const sobre = cifrar("x", clave);
    expect(descifrar(sobre, randomBytes(32))).toBeNull();
    const partes = sobre.split(":");
    partes[3] = Buffer.from("otra cosa").toString("base64");
    expect(descifrar(partes.join(":"), clave)).toBeNull();
    expect(descifrar("basura", clave)).toBeNull();
  });

  it("sin CONFIG_CLAVE válida no se puede cifrar (400)", () => {
    expect(claveConfiguracion(undefined)).toBeNull();
    expect(claveConfiguracion(Buffer.alloc(16).toString("base64"))).toBeNull();
    expect(claveConfiguracion(clave.toString("base64"))?.length).toBe(32);
    expect(() => cifrar("x", null)).toThrow(/CONFIG_CLAVE/);
  });
});
