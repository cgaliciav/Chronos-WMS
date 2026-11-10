/**
 * Fachada de correo con la interfaz de siempre (`EnviarMail.correoNuevoUsuario(…)`) para no tocar los controladores.
 * Desde el plan 03 (fase 2) los textos, el remitente y el transporte salen de la configuración por cliente
 * (`services/CorreoService.ts`, plantillas en `services/reglas/correo.ts`). Todos envían en segundo plano y dejan
 * constancia en LogGeneral; ninguno rechaza.
 */
import CorreoService from "../services/CorreoService";

export default class EnviarMail {
  /** Alta de usuario con su contraseña temporal (hallazgo L2). */
  static correoNuevoUsuario = (correoDestino: string, password: string) =>
    CorreoService.enviarEnSegundoPlano("nuevoUsuario", correoDestino, { clave: password });

  /** Contraseña temporal regenerada por el administrador (hallazgo L2). */
  static correoNuevoPassword = (correoDestino: string, password: string) =>
    CorreoService.enviarEnSegundoPlano("nuevoPassword", correoDestino, { clave: password });

  static correoConAnexos = (correoDestino: string, archivos: { filename: string; path: string }[]) =>
    CorreoService.enviarEnSegundoPlano("reporteAnexo", correoDestino, { archivo: archivos.map((a) => a.filename).join(", ") }, archivos);

  static correoAlerta = (correoDestino: string, alerta: string) => CorreoService.enviarEnSegundoPlano("alerta", correoDestino, { alerta });

  static correorReporteDescarga = (correoDestino: string, archivo: { filename: string; path: string }) =>
    CorreoService.enviarEnSegundoPlano("reporteDescarga", correoDestino, { archivo: archivo.filename, enlace: archivo.path });
}
