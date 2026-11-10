/**
 * Contraseñas temporales con cambio obligatorio (hallazgo L2). El administrador da de alta a un usuario o le regenera
 * la contraseña: se genera una temporal, se envía por correo y vence a las `HORAS_PASSWORD_TEMPORAL` (72 h por
 * defecto). Con ella el usuario solo puede entrar para cambiarla: el token lleva `cp` y `checkJwt` rechaza cualquier
 * otra ruta (`rutaPermitidaConCambioPendiente`).
 */
import { Usuario } from "../entity/Usuario";
import passGenerator from "../helpers/passGenerator";

/** Horas de validez de una contraseña temporal. */
export const horasPasswordTemporal = (valor = process.env.HORAS_PASSWORD_TEMPORAL) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 72;
};

/** Genera una contraseña temporal, la guarda cifrada en `usuario` y la devuelve en claro (para el correo). */
export const asignarPasswordTemporal = (usuario: Usuario, ahora = new Date()): string => {
  const password = passGenerator.generarPassword();
  usuario.password = password;
  usuario.hashPassword();
  usuario.debeCambiarPassword = true;
  usuario.vencePasswordTemporal = new Date(ahora.getTime() + horasPasswordTemporal() * 60 * 60 * 1000);
  return password;
};

/** Guarda la contraseña que eligió el usuario y quita la marca de temporal. */
export const asignarPasswordDefinitiva = (usuario: Usuario, password: string) => {
  usuario.password = password;
  usuario.hashPassword();
  usuario.debeCambiarPassword = false;
  usuario.vencePasswordTemporal = null;
};

/** ¿La contraseña temporal ya venció? (Sin fecha de vencimiento no vence.) */
export const passwordTemporalVencida = (usuario: Pick<Usuario, "debeCambiarPassword" | "vencePasswordTemporal">, ahora = new Date()) =>
  Boolean(usuario.debeCambiarPassword && usuario.vencePasswordTemporal && new Date(usuario.vencePasswordTemporal) <= ahora);

/**
 * Rutas que acepta un token con cambio de contraseña pendiente: cambiarla, ver la propia cuenta (el front la carga al
 * arrancar) y cerrar sesión.
 */
const PERMITIDAS = new Set(["PUT /user/password", "GET /user/current", "POST /auth/logout"]);

export const rutaPermitidaConCambioPendiente = (metodo: string, ruta: string) =>
  PERMITIDAS.has(`${metodo.toUpperCase()} ${ruta.split("?")[0].replace(/\/+$/, "")}`);
