// Lista explícita de migraciones, en orden. Úsala en lugar de globs cuando el entorno (Jest) pueda
// cargar dos copias del mismo módulo. ormconfig.js usa el glob src/migration/[0-9]*-*.ts para la CLI y la app.
import { Baseline1794083852310 } from "./1794083852310-Baseline";
import { MovimientoRelacion1794084035404 } from "./1794084035404-MovimientoRelacion";

export const MIGRACIONES: Function[] = [Baseline1794083852310, MovimientoRelacion1794084035404];
