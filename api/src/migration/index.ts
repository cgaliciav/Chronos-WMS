// Lista explícita de migraciones, en orden. Úsala en lugar de globs cuando el entorno (Jest) pueda
// cargar dos copias del mismo módulo. La app, migrar.ts y las pruebas usan esta lista (sin globs).
import { Baseline1794083852310 } from "./1794083852310-Baseline";
import { MovimientoRelacion1794084035404 } from "./1794084035404-MovimientoRelacion";
import { Notificacion1794327605255 } from "./1794327605255-Notificacion";
import { PasswordTemporal1794336939132 } from "./1794336939132-PasswordTemporal";
import { Configuracion1794338006363 } from "./1794338006363-Configuracion";
import { ConsumiblesYBajasPorCantidad1794932436077 } from "./1794932436077-ConsumiblesYBajasPorCantidad";
import { UsuarioModoVisibilidad1794933218644 } from "./1794933218644-UsuarioModoVisibilidad";
import { Transformacion1794933820065 } from "./1794933820065-Transformacion";
import { RolesFaltantes1794937000000 } from "./1794937000000-RolesFaltantes";

export const MIGRACIONES: Function[] = [Baseline1794083852310, MovimientoRelacion1794084035404, Notificacion1794327605255, PasswordTemporal1794336939132, Configuracion1794338006363, ConsumiblesYBajasPorCantidad1794932436077, UsuarioModoVisibilidad1794933218644, Transformacion1794933820065, RolesFaltantes1794937000000];
