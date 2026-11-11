/**
 * Carga inicial de una base nueva (`semilla/sembrarInicial.ts`). Usa una base propia `${DB_DATABASE_NAME}_semilla`
 * (el usuario de pruebas no puede crearla: se crea y se usa con root, `DB_ROOT_PASSWORD`, "root" en el compose y en CI).
 */
import "./env";
import * as bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { Usuario } from "../entity/Usuario";
import catalogo from "../semilla/catalogo.json";
import { BaseEnUsoError, Catalogo, sembrarInicial } from "../semilla/sembrarInicial";
import { fuentePruebas } from "./conexion";

const CATALOGO = catalogo as Catalogo;
const CORREO = "admin-semilla@pruebas.local";
const OPCIONES = { adminCorreo: CORREO, adminNombre: "Administrador Semilla" };
const TABLAS = ["movimiento_tipo", "rol", "precio_tipo", "factura_tipo", "producto_tipo", "parametros", "usuario"];

describe("carga inicial de una base nueva", () => {
  const database = `${process.env.DB_DATABASE_NAME}_semilla`;
  const credenciales = { username: "root", password: process.env.DB_ROOT_PASSWORD ?? "root" };
  let conexion: DataSource;

  const conteos = async () => {
    const r: Record<string, number> = {};
    for (const t of TABLAS) r[t] = Number((await conexion.query(`SELECT COUNT(*) AS n FROM \`${t}\``))[0].n);
    return r;
  };
  const hashAdmin = async () =>
    (await conexion.query("SELECT password, debeCambiarPassword, vencePasswordTemporal FROM usuario WHERE correo = ?", [CORREO]))[0];

  beforeAll(async () => {
    const admin = await fuentePruebas({ database: undefined, ...credenciales, entities: [], migrations: [], subscribers: [] }).initialize();
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await admin.destroy();
    conexion = await fuentePruebas({ database, ...credenciales, dropSchema: true, subscribers: [] }).initialize();
    await conexion.runMigrations({ transaction: "each" });
  });
  afterAll(async () => {
    if (conexion?.isInitialized) await conexion.destroy();
  });

  it("base vacía: siembra catálogos y crea el administrador con contraseña temporal", async () => {
    const antes = Date.now();
    const r = await sembrarInicial(conexion, CATALOGO, OPCIONES);

    const tipos = await conexion.query("SELECT id, nombre FROM movimiento_tipo ORDER BY id");
    expect(tipos.map((t: { id: number }) => Number(t.id))).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    expect(tipos.map((t: { nombre: string }) => t.nombre)).toEqual(CATALOGO.movimientoTipo.map((t) => t.nombre));

    for (const { codigoRol } of CATALOGO.rol) {
      const n = (await conexion.query("SELECT COUNT(*) AS n FROM rol WHERE codigoRol = ?", [codigoRol]))[0].n;
      expect(Number(n)).toBe(1);
    }
    expect(Number((await conexion.query("SELECT COUNT(*) AS n FROM rol WHERE codigoRol = 'CONFIGURACION-EDITAR'"))[0].n)).toBe(1);
    expect(Number((await conexion.query("SELECT COUNT(*) AS n FROM precio_tipo"))[0].n)).toBe(CATALOGO.precioTipo.length);
    expect(Number((await conexion.query("SELECT COUNT(*) AS n FROM factura_tipo"))[0].n)).toBe(CATALOGO.facturaTipo.length);
    expect(Number((await conexion.query("SELECT COUNT(*) AS n FROM producto_tipo"))[0].n)).toBe(CATALOGO.productoTipo.length);
    expect(r.insertados.movimientoTipo).toBe(17);

    expect(r.adminCreado).toBe(true);
    expect(r.passwordTemporal).toBeTruthy();
    const usuario = await conexion
      .getRepository(Usuario)
      .createQueryBuilder("u")
      .leftJoinAndSelect("u.roles", "rol")
      .addSelect(["u.password", "u.debeCambiarPassword", "u.vencePasswordTemporal"])
      .where("u.correo = :c", { c: CORREO })
      .getOneOrFail();
    expect(usuario.roles.map((x) => x.codigoRol)).toEqual(["ADMINISTRADOR"]);
    expect(usuario.debeCambiarPassword).toBe(true);
    const horas = (new Date(usuario.vencePasswordTemporal!).getTime() - antes) / 3_600_000;
    expect(horas).toBeGreaterThan(71.9);
    expect(horas).toBeLessThan(72.1);
    expect(bcrypt.compareSync(r.passwordTemporal!, usuario.password)).toBe(true);
  });

  it("idempotente: la segunda vez no inserta nada ni cambia la contraseña", async () => {
    const antes = await hashAdmin();
    const r = await sembrarInicial(conexion, CATALOGO, OPCIONES);
    expect(Object.values(r.insertados).every((n) => n === 0)).toBe(true);
    expect(r.adminCreado).toBe(false);
    expect(r.passwordTemporal).toBeNull();
    expect((await hashAdmin()).password).toBe(antes.password);
  });

  it("--regenerar da una contraseña temporal nueva al administrador existente", async () => {
    const antes = await hashAdmin();
    const r = await sembrarInicial(conexion, CATALOGO, { ...OPCIONES, regenerar: true });
    expect(r.adminCreado).toBe(false);
    expect(r.passwordTemporal).toBeTruthy();
    const despues = await hashAdmin();
    expect(despues.password).not.toBe(antes.password);
    expect(bcrypt.compareSync(r.passwordTemporal!, despues.password)).toBe(true);
    expect(Number(despues.debeCambiarPassword)).toBe(1);
  });

  it("se niega si la base ya tiene movimientos", async () => {
    await conexion.query("INSERT INTO movimiento (cantidad) VALUES (1)");
    const antes = await conteos();
    await expect(sembrarInicial(conexion, CATALOGO, { adminCorreo: "otro@pruebas.local", adminNombre: "Otro" })).rejects.toBeInstanceOf(
      BaseEnUsoError
    );
    expect(await conteos()).toEqual(antes);
  });
});
