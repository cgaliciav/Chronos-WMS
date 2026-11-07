// Genera el SQL que falta para que la BD de pruebas coincida con las entidades (lo mismo que
// `typeorm migration:generate`, pero con la lista explícita de entidades y sin depender de ormconfig.js).
// Uso: npx ts-node src/test/generarMigracion.ts Nombre [--vaciar]
//   --vaciar  borra el esquema antes (para generar la baseline completa).
// Escribe src/migration/<timestamp>-<Nombre>.ts y no ejecuta nada.
import "./env";
import { createConnection } from "typeorm";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { opcionesConexionPruebas } from "./conexion";
import { MIGRACIONES } from "../migration";

const escapar = (sql: string) => sql.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

(async () => {
  const nombre = process.argv[2];
  if (!nombre || !/^[A-Z][A-Za-z0-9]+$/.test(nombre)) throw new Error("Indica un nombre en PascalCase");
  const vaciar = process.argv.includes("--vaciar");
  const conexion = await createConnection(
    opcionesConexionPruebas({ name: "generar", dropSchema: vaciar, subscribers: [], migrations: vaciar ? [] : MIGRACIONES } as any)
  );
  try {
    if (!vaciar) await conexion.runMigrations({ transaction: "each" });
    const { upQueries, downQueries } = await conexion.driver.createSchemaBuilder().log();
    if (upQueries.length === 0) {
      console.log("Sin cambios: el esquema coincide con las entidades.");
      return;
    }
    const ts = Date.now();
    const linea = (q: { query: string; parameters?: any[] }) =>
      `        await queryRunner.query(\`${escapar(q.query)}\`${q.parameters?.length ? `, ${JSON.stringify(q.parameters)}` : ""});`;
    const contenido = `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${nombre}${ts} implements MigrationInterface {
    name = "${nombre}${ts}";

    public async up(queryRunner: QueryRunner): Promise<void> {
${upQueries.map(linea).join("\n")}
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
${downQueries.reverse().map(linea).join("\n")}
    }
}
`;
    const archivo = resolve(__dirname, "../migration", `${ts}-${nombre}.ts`);
    writeFileSync(archivo, contenido);
    console.log(`Escrita ${archivo} (${upQueries.length} sentencias).`);
  } finally {
    await conexion.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
