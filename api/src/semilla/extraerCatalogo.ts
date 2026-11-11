/**
 * Genera `catalogo.json` leyendo los catálogos de una base de origen (p. ej. staging). Solo SELECT; no escribe en la base.
 *   DB_HOST=127.0.0.1 DB_PORT=3308 DB_USER=... DB_PASSWORD=... DB_DATABASE_NAME=... npm run semilla:extraer
 * Excluye filas con estatus `eliminado`. Nunca lee usuarios ni datos de personas: solo tablas de catálogo.
 */
import "../entorno";
import "reflect-metadata";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { DataSource } from "typeorm";
import type { Catalogo } from "./sembrarInicial";

/** Catálogos con id fijo y columnas `nombre` y `estatus`. */
const tipoConId = async (conexion: DataSource, tabla: string, conEstatus: boolean) =>
  (await conexion.query(
    `SELECT id, nombre, estatus FROM \`${tabla}\` WHERE estatus <> 'eliminado' ORDER BY id`
  )).map((f: { id: number; nombre: string; estatus: string }) =>
    conEstatus ? { id: Number(f.id), nombre: f.nombre, estatus: f.estatus } : { id: Number(f.id), nombre: f.nombre }
  );

(async () => {
  const conexion = await new DataSource({
    type: "mariadb",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE_NAME,
    entities: [],
    synchronize: false,
  }).initialize();
  try {
    const catalogo: Catalogo = {
      movimientoTipo: await tipoConId(conexion, "movimiento_tipo", true),
      rol: (await conexion.query("SELECT nombre, codigoRol, estatus FROM `rol` WHERE estatus <> 'eliminado' ORDER BY codigoRol")).map(
        (f: { nombre: string; codigoRol: string; estatus: string }) => ({ nombre: f.nombre, codigoRol: f.codigoRol, estatus: f.estatus })
      ),
      precioTipo: await tipoConId(conexion, "precio_tipo", false),
      facturaTipo: await tipoConId(conexion, "factura_tipo", false),
      productoTipo: await tipoConId(conexion, "producto_tipo", false),
      parametros: (await conexion.query("SELECT llave, valor FROM `parametros` ORDER BY llave")).map(
        (f: { llave: string; valor: string }) => ({ llave: f.llave, valor: f.valor })
      ),
    };
    const destino = resolve(__dirname, "catalogo.json");
    writeFileSync(destino, JSON.stringify(catalogo, null, 2) + "\n");
    console.log(
      `Catálogo escrito en ${destino}: ` + Object.entries(catalogo).map(([k, v]) => `${k}=${(v as unknown[]).length}`).join(", ")
    );
  } finally {
    await conexion.destroy();
  }
})().catch((error) => {
  console.error("No se pudo extraer el catálogo:", error.message);
  process.exit(1);
});
