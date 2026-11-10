// Carga .env.test antes de cualquier módulo. Las variables ya presentes en el entorno (CI) ganan.
import "reflect-metadata";
import * as dotenv from "dotenv";
import { isAbsolute, resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../.env.test"), quiet: true });

// `res.sendFile` exige rutas absolutas: las rutas relativas de .env.test se resuelven contra api/.
for (const ruta of ["RUTA_ARCHIVOS", "RUTA_REPORTES", "UPLOADS", "ARCHIVOS_AUXILIARES", "IMAGENES_IMPORTACION"]) {
  const valor = process.env[ruta];
  if (valor && !isAbsolute(valor)) process.env[ruta] = resolve(__dirname, "../..", valor);
}

// Las pruebas de integración hacen varias peticiones HTTP reales contra MariaDB.
if (typeof jest !== "undefined") jest.setTimeout(30000);
