// Recrea el esquema de la BD de pruebas y la siembra. Se ejecuta como script ANTES de Jest
// (npm run test:int). No se usa como globalSetup de Jest porque, en modo --runInBand, las entidades
// cargadas por Node en el setup y por Jest en las pruebas quedarían registradas dos veces en TypeORM.
import "./env";
import { createConnection } from "typeorm";
import { mkdirSync } from "fs";
import { opcionesConexionPruebas } from "./conexion";
import { sembrar } from "./seed";

(async () => {
  for (const ruta of ["RUTA_ARCHIVOS", "RUTA_REPORTES", "UPLOADS", "ARCHIVOS_AUXILIARES", "IMAGENES_IMPORTACION"]) {
    if (process.env[ruta]) mkdirSync(process.env[ruta], { recursive: true });
  }
  const connection = await createConnection(
    opcionesConexionPruebas({ name: "setup", dropSchema: true, synchronize: true, subscribers: [] } as any) // sin auditoría al sembrar
  );
  try {
    await sembrar(connection);
    console.log(`BD de pruebas ${process.env.DB_DATABASE_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT} recreada y sembrada.`);
  } finally {
    await connection.close();
  }
})().catch((error) => {
  console.error("No se pudo preparar la BD de pruebas:", error.message);
  process.exit(1);
});
