/**
 * Correo desde la configuración por cliente (plan 03, fase 2). El transporte sale de `elegirTransporte` y se recrea
 * cuando cambia la configuración (`version`) o `SMTP_ANULAR`; el remitente y los textos, de `correo` y `marca`.
 */
import * as nodemailer from "nodemailer";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { LogTipo } from "../entity/LogGeneral";
import { AppError } from "../helpers/errorClases";
import { logger } from "../helpers/logger";
import ConfiguracionService from "./ConfiguracionService";
import { horasPasswordTemporal } from "./PasswordService";
import { DescriptorTransporte, elegirTransporte, plantillaDe, remitente, renderizar, TipoPlantilla } from "./reglas/correo";

/** Lo que el servicio necesita de un transporte de nodemailer (las pruebas lo sustituyen). */
export interface TransporteCorreo {
  sendMail(mensaje: Record<string, unknown>): Promise<{ messageId?: string; response?: string }>;
  verify(): Promise<unknown>;
}

const REMITENTE_POR_DEFECTO = () => process.env.SMTP_FROM || "chronoswms@exogrid.xyz";

let actual: { clave: string; tipo: DescriptorTransporte["tipo"]; transporte: TransporteCorreo } | null = null;

export interface Adjunto {
  filename: string;
  path: string;
}

export default class CorreoService {
  /** Crea el transporte de nodemailer. Las pruebas lo sustituyen por uno que captura los mensajes. */
  static fabrica = (descriptor: DescriptorTransporte): TransporteCorreo =>
    nodemailer.createTransport(descriptor.opciones, descriptor.cabeceras ? { headers: descriptor.cabeceras } : {}) as unknown as TransporteCorreo;

  /** El transporte vigente; se recrea si cambió la configuración de correo o `SMTP_ANULAR`. */
  static transporte = async () => {
    const { valor, version } = await ConfiguracionService.leer("correo");
    const clave = `${version}|${process.env.SMTP_ANULAR ?? ""}`;
    if (actual?.clave === clave) return actual;
    let contrasena: string | null = null;
    if (valor.transporte?.contrasenaCifrada) {
      contrasena = await ConfiguracionService.contrasenaSmtp();
      if (contrasena === null) logger.warn("Correo: no se pudo descifrar la contraseña SMTP (¿CONFIG_CLAVE distinta?)");
    }
    const descriptor = elegirTransporte(valor, contrasena);
    actual = { clave, tipo: descriptor.tipo, transporte: CorreoService.fabrica(descriptor) };
    // Sin secretos: solo el tipo y el servidor
    logger.info(`Correo: transporte ${descriptor.tipo} (${descriptor.opciones.host}:${descriptor.opciones.port})`);
    return actual;
  };

  /** Variables comunes a todas las plantillas. */
  private static variablesBase = async () => {
    const [{ valor: marca }, { valor: correo }] = await Promise.all([ConfiguracionService.leer("marca"), ConfiguracionService.leer("correo")]);
    return {
      correo,
      remitente: remitente(correo.remitente.nombre, correo.remitente.correo ?? REMITENTE_POR_DEFECTO()),
      variables: {
        nombreApp: marca.nombreApp,
        organizacion: marca.organizacion,
        soporteCorreo: correo.soporteCorreo ?? marca.soporteCorreo,
        horas: horasPasswordTemporal(),
      },
    };
  };

  /** Envía el correo de `tipo` con su plantilla. Lanza si el SMTP falla (quien llama decide si lo registra). */
  static enviar = async (tipo: TipoPlantilla, destino: string, variables: Record<string, string | number>, adjuntos?: Adjunto[]) => {
    const base = await CorreoService.variablesBase();
    const todas = { ...base.variables, correo: destino, ...variables };
    const plantilla = plantillaDe(base.correo, tipo);
    const { transporte } = await CorreoService.transporte();
    return transporte.sendMail({
      from: base.remitente,
      to: destino,
      subject: renderizar(plantilla.asunto, todas),
      text: renderizar(plantilla.cuerpo, todas),
      ...(adjuntos ? { attachments: adjuntos } : {}),
    });
  };

  /** Envía sin esperar y deja constancia en LogGeneral (como hacía `enviarMail`): nunca rechaza. */
  static enviarEnSegundoPlano = (tipo: TipoPlantilla, destino: string, variables: Record<string, string | number>, adjuntos?: Adjunto[]) => {
    void CorreoService.enviar(tipo, destino, variables, adjuntos)
      .then((info) => LogGeneralController.InsertarLog(LogTipo.INFO, "Correo Enviado", info))
      .catch((error) => LogGeneralController.InsertarLog(LogTipo.ERROR, "Correo NO Enviado", error));
  };

  /** `POST /config/correo/prueba`: correo de prueba con la configuración guardada. 502 con el error SMTP si falla. */
  static enviarPrueba = async (destino: string) => {
    const base = await CorreoService.variablesBase();
    const { tipo, transporte } = await CorreoService.transporte();
    try {
      const info = await transporte.sendMail({
        from: base.remitente,
        to: destino,
        subject: `${base.variables.nombreApp} - correo de prueba`,
        text: `Este es un correo de prueba de ${base.variables.nombreApp}. Si lo recibes, la configuración de correo funciona.`,
      });
      return { enviado: true, transporte: tipo, destino, messageId: info.messageId ?? null, respuesta: info.response ?? null };
    } catch (error) {
      throw new AppError(`No se pudo enviar el correo de prueba: ${(error as Error).message}`, 502, { transporte: tipo });
    }
  };

  /** Al arrancar: informa del transporte y comprueba la conexión (solo log; no impide arrancar). */
  static verificar = async () => {
    try {
      const { tipo, transporte } = await CorreoService.transporte();
      await transporte.verify();
      logger.info(`SMTP correcto (transporte ${tipo})`);
    } catch (error) {
      logger.error("SMTP error:", (error as Error).message);
    }
  };

  /** Solo pruebas: olvida el transporte para que se vuelva a crear. */
  static olvidarTransporte = () => {
    actual = null;
  };
}
