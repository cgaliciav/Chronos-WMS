/**
 * Migraciones sin ts-node (la imagen de producción solo tiene el código compilado):
 *   node build/migrar.js show     lista las migraciones y marca las aplicadas
 *   node build/migrar.js run      aplica las pendientes
 *   node build/migrar.js revert   revierte la última
 * En desarrollo: npx ts-node src/migrar.ts <orden>. Usa las variables DB_* del entorno (y .env fuera de producción).
 * Procedimiento completo: docs/api/procedimiento-migracion-produccion.md.
 */
import "./entorno"; // primero: carga .env antes de que otros módulos lean process.env (M34)
import "reflect-metadata";
import { createConnection } from "typeorm";
import { opcionesConexion } from "./conexionORM";

const orden = process.argv[2];

(async () => {
  if (!["show", "run", "revert"].includes(orden)) {
    console.error("Uso: node build/migrar.js show|run|revert");
    process.exit(2);
  }
  const conexion = await createConnection(opcionesConexion({ synchronize: false, subscribers: [], logging: ["error", "migration"] } as any));
  try {
    if (orden === "show") {
      const tabla = "migrations";
      const aplicadas = new Set(
        (await conexion.query(`SELECT name FROM \`${tabla}\``).catch(() => [])).map((f: { name: string }) => f.name)
      );
      for (const m of conexion.migrations) console.log(`${aplicadas.has(m.name) ? "[X]" : "[ ]"} ${m.name}`);
      process.exitCode = (await conexion.showMigrations()) ? 1 : 0; // 1 = hay pendientes
    } else if (orden === "run") {
      const hechas = await conexion.runMigrations({ transaction: "each" });
      console.log(hechas.length ? `Aplicadas: ${hechas.map((m) => m.name).join(", ")}` : "No había migraciones pendientes.");
    } else {
      await conexion.undoLastMigration({ transaction: "each" });
      console.log("Última migración revertida.");
    }
  } finally {
    await conexion.close();
  }
})().catch((error) => {
  console.error("Error en las migraciones:", error);
  process.exit(1);
});
