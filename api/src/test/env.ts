// Carga .env.test antes de cualquier módulo. Las variables ya presentes en el entorno (CI) ganan.
import "reflect-metadata";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../.env.test"), quiet: true });

// Las pruebas de integración hacen varias peticiones HTTP reales contra MariaDB.
if (typeof jest !== "undefined") jest.setTimeout(30000);
