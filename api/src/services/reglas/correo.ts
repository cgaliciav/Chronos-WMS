/**
 * Reglas puras del correo (plan 03, fase 2): plantillas con `{{variables}}` y elección del transporte SMTP.
 */
import { ConfigCorreo, TIPOS_PLANTILLA } from "../../esquemas/configuracion";

export type TipoPlantilla = (typeof TIPOS_PLANTILLA)[number];
export interface Plantilla {
  asunto: string;
  cuerpo: string;
}

const PIE =
  "\n\n\nEste correo se genera automáticamente; si tienes problemas técnicos con el sistema escríbenos a {{soporteCorreo}}.";
const TEMPORAL =
  "Es una contraseña temporal: vence en {{horas}} horas y al entrar el sistema te pedirá elegir una nueva. " +
  "Si venció, pide a tu administrador que genere otra.";

/** Plantillas del producto; cada cliente puede sustituir cualquiera desde `correo.plantillas`. */
export const PLANTILLAS_POR_DEFECTO: Record<TipoPlantilla, Plantilla> = {
  nuevoUsuario: {
    asunto: "BIENVENIDO A {{nombreApp}}",
    cuerpo:
      "Bienvenido a {{nombreApp}},\n\nFuiste dado de alta por el administrador, tu acceso es mediante los siguientes datos:\n" +
      `correo: {{correo}}\ncontraseña temporal: {{clave}}\n\n${TEMPORAL}${PIE}`,
  },
  nuevoPassword: {
    asunto: "NUEVA CONTRASEÑA TEMPORAL - {{nombreApp}}",
    cuerpo: `El administrador generó una nueva contraseña para tu acceso:\ncorreo: {{correo}}\ncontraseña temporal: {{clave}}\n\n${TEMPORAL}${PIE}`,
  },
  reporteAnexo: {
    asunto: "GENERACION DE REPORTE EXITOSO - {{nombreApp}}",
    cuerpo: `En el archivo anexo encontrará el reporte solicitado: {{archivo}}${PIE}`,
  },
  reporteDescarga: {
    asunto: "{{nombreApp}} - REPORTE PARA DESCARGA",
    cuerpo: `Se generó el siguiente reporte:\n\n{{archivo}}\n\nCopia y pega el enlace de descarga: {{enlace}}\n\nSi tienes dudas comunícate con tu administrador.${PIE}`,
  },
  alerta: {
    asunto: "{{nombreApp}} - ALERTA",
    cuerpo: `Se generó la siguiente alerta en el sistema:\n\n{{alerta}}\n\nSi tienes dudas comunícate con tu administrador.${PIE}`,
  },
};

/** Sustituye `{{variable}}` por su valor como texto plano (sin evaluar nada); una variable sin valor queda vacía. */
export const renderizar = (texto: string, variables: Record<string, string | number | undefined>) =>
  texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_todo, nombre: string) => String(variables[nombre] ?? ""));

/** Plantilla efectiva: la del cliente si existe, si no la del producto. */
export const plantillaDe = (correo: ConfigCorreo, tipo: TipoPlantilla): Plantilla =>
  (correo.plantillas as Partial<Record<TipoPlantilla, Plantilla>>)[tipo] ?? PLANTILLAS_POR_DEFECTO[tipo];

/** `"Nombre" <correo>` (comillas escapadas). */
export const remitente = (nombre: string, correo: string) => `"${nombre.replace(/["\\]/g, "")}" <${correo}>`;

export interface DescriptorTransporte {
  /** `anulado`: `SMTP_ANULAR` gana sobre todo (staging, desarrollo); `bd`: configuración; `entorno`: variables `SMTP_*`. */
  tipo: "anulado" | "bd" | "entorno";
  opciones: {
    host: string;
    port: number;
    secure?: boolean;
    ignoreTLS?: boolean;
    auth?: { user: string; pass?: string; method?: string };
  };
  /** Cabeceras por defecto de cada mensaje. */
  cabeceras?: Record<string, string>;
}

/**
 * Elige el transporte (plan 03 §2.4): `SMTP_ANULAR` (`host:puerto`) gana sobre la BD y no lleva credenciales, para que
 * un entorno con datos de producción (staging) nunca escriba a usuarios reales; después la configuración guardada; si
 * no hay, las variables `SMTP_*` de siempre (con la cabecera de Postmark que ya usaba producción).
 */
export const elegirTransporte = (
  correo: ConfigCorreo,
  contrasena: string | null,
  entorno: NodeJS.ProcessEnv = process.env
): DescriptorTransporte => {
  const anular = entorno.SMTP_ANULAR?.trim();
  if (anular) {
    const [host, puerto] = anular.split(":");
    return { tipo: "anulado", opciones: { host, port: Number(puerto) || 1025, secure: false, ignoreTLS: true } };
  }
  const t = correo.transporte;
  if (t) {
    return {
      tipo: "bd",
      opciones: {
        host: t.host,
        port: t.puerto,
        secure: t.seguro,
        ...(t.usuario ? { auth: { user: t.usuario, ...(contrasena ? { pass: contrasena } : {}) } } : {}),
      },
      ...(t.cabeceras ? { cabeceras: t.cabeceras } : {}),
    };
  }
  return {
    tipo: "entorno",
    opciones: {
      host: entorno.SMTP_HOST || "smtp.postmarkapp.com",
      port: Number(entorno.SMTP_PORT || 2525),
      auth: { user: entorno.SMTP_USER ?? "", pass: entorno.SMTP_PASS, method: "PLAIN" },
    },
    cabeceras: { "X-PM-Message-Stream": "outbound" },
  };
};
