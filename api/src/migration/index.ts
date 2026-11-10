// Lista explícita de migraciones, en orden. Úsala en lugar de globs cuando el entorno (Jest) pueda
// cargar dos copias del mismo módulo. La app, migrar.ts y las pruebas usan esta lista (sin globs).
import { Baseline1794083852310 } from "./1794083852310-Baseline";
import { MovimientoRelacion1794084035404 } from "./1794084035404-MovimientoRelacion";
import { Notificacion1794327605255 } from "./1794327605255-Notificacion";

export const MIGRACIONES: Function[] = [Baseline1794083852310, MovimientoRelacion1794084035404, Notificacion1794327605255];
