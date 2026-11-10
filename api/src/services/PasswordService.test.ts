jest.mock("../controllers/LogGeneral.Controller", () => ({ __esModule: true, default: { InsertarLog: jest.fn() } }));
import bcrypt from "bcryptjs";
import { Usuario } from "../entity/Usuario";
import {
  asignarPasswordDefinitiva,
  asignarPasswordTemporal,
  horasPasswordTemporal,
  passwordTemporalVencida,
  rutaPermitidaConCambioPendiente,
} from "./PasswordService";

describe("PasswordService (L2)", () => {
  beforeAll(() => {
    process.env.SALT_ROUNDS = "4";
  });

  it("la contraseña temporal se guarda cifrada, marca el cambio pendiente y vence a las 72 h", () => {
    const usuario = new Usuario();
    const ahora = new Date("2026-11-10T12:00:00Z");
    const temporal = asignarPasswordTemporal(usuario, ahora);
    expect(temporal).toMatch(/^.{8,20}$/);
    expect(usuario.password).not.toBe(temporal);
    expect(bcrypt.compareSync(temporal, usuario.password)).toBe(true);
    expect(usuario.debeCambiarPassword).toBe(true);
    expect(usuario.vencePasswordTemporal?.toISOString()).toBe("2026-11-13T12:00:00.000Z");
  });

  it("vencimiento: solo con cambio pendiente y fecha pasada", () => {
    const ahora = new Date("2026-11-10T12:00:00Z");
    expect(passwordTemporalVencida({ debeCambiarPassword: true, vencePasswordTemporal: new Date("2026-11-10T11:59:59Z") }, ahora)).toBe(true);
    expect(passwordTemporalVencida({ debeCambiarPassword: true, vencePasswordTemporal: new Date("2026-11-11T00:00:00Z") }, ahora)).toBe(false);
    expect(passwordTemporalVencida({ debeCambiarPassword: false, vencePasswordTemporal: new Date("2026-01-01T00:00:00Z") }, ahora)).toBe(false);
    expect(passwordTemporalVencida({ debeCambiarPassword: true, vencePasswordTemporal: null }, ahora)).toBe(false);
  });

  it("la definitiva quita la marca", () => {
    const usuario = new Usuario();
    asignarPasswordTemporal(usuario);
    asignarPasswordDefinitiva(usuario, "Nueva123");
    expect(usuario.debeCambiarPassword).toBe(false);
    expect(usuario.vencePasswordTemporal).toBeNull();
    expect(bcrypt.compareSync("Nueva123", usuario.password)).toBe(true);
  });

  it("HORAS_PASSWORD_TEMPORAL", () => {
    expect(horasPasswordTemporal("24")).toBe(24);
    expect(horasPasswordTemporal(undefined)).toBe(72);
    expect(horasPasswordTemporal("0")).toBe(72);
  });

  it("con cambio pendiente solo se permite cambiarla, ver la cuenta y salir", () => {
    expect(rutaPermitidaConCambioPendiente("PUT", "/user/password")).toBe(true);
    expect(rutaPermitidaConCambioPendiente("get", "/user/current/?x=1")).toBe(true);
    expect(rutaPermitidaConCambioPendiente("POST", "/auth/logout")).toBe(true);
    expect(rutaPermitidaConCambioPendiente("GET", "/groups/1")).toBe(false);
    expect(rutaPermitidaConCambioPendiente("GET", "/user/password")).toBe(false);
  });
});
