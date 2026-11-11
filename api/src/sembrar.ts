/**
 * Carga inicial de una base nueva (cliente nuevo), sin ts-node en la imagen:
 *   node build/sembrar.js --admin-correo <correo> --admin-nombre "<nombre>" [--regenerar]
 * Siembra los catálogos de `semilla/catalogo.json` y crea al primer administrador con contraseña temporal (se imprime y
 * se envía por correo; un fallo de correo solo avisa). Salida: 0 bien, 2 uso incorrecto, 3 la base ya tiene movimientos
 * (BaseEnUsoError), 1 otro error. En desarrollo: npm run semilla:run -- --admin-correo ... --admin-nombre ...
 */
import "./entorno"; // primero: carga .env antes de que otros módulos lean process.env
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import CorreoService from "./services/CorreoService";
import catalogo from "./semilla/catalogo.json";
import { BaseEnUsoError, Catalogo, sembrarInicial } from "./semilla/sembrarInicial";

const argumento = (nombre: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

(async () => {
  const adminCorreo = argumento("admin-correo");
  const adminNombre = argumento("admin-nombre");
  if (!adminCorreo || !adminNombre) {
    console.error('Uso: node build/sembrar.js --admin-correo <correo> --admin-nombre "<nombre>" [--regenerar]');
    process.exit(2);
  }
  // La fuente de la app (no una propia): el correo lee su configuración de la base con ella. Sin auditoría, como migrar.ts.
  AppDataSource.setOptions({ synchronize: false, subscribers: [] });
  const conexion = await AppDataSource.initialize();
  try {
    const r = await sembrarInicial(conexion, catalogo as Catalogo, { adminCorreo, adminNombre, regenerar: process.argv.includes("--regenerar") });
    console.log("Filas insertadas:", JSON.stringify(r.insertados));
    if (r.passwordTemporal) {
      console.log(`${r.adminCreado ? "Administrador creado" : "Contraseña regenerada"}: ${adminCorreo}`);
      console.log(`Contraseña temporal: ${r.passwordTemporal}`);
      try {
        // Mismo correo que `EnviarMail.correoNuevoUsuario`, pero esperado (esa fachada envía en segundo plano y la CLI cierra la conexión)
        await CorreoService.enviar("nuevoUsuario", adminCorreo, { clave: r.passwordTemporal });
        console.log("Correo enviado a", adminCorreo);
      } catch (error) {
        console.warn("No se pudo enviar el correo (usa la contraseña impresa arriba):", (error as Error).message);
      }
    } else {
      console.log("El administrador ya existía: no se cambió su contraseña (usa --regenerar para una nueva).");
    }
  } finally {
    await conexion.destroy();
  }
})().catch((error) => {
  if (error instanceof BaseEnUsoError) {
    console.error(error.message);
    process.exit(3);
  }
  console.error("Error en la carga inicial:", error);
  process.exit(1);
});
