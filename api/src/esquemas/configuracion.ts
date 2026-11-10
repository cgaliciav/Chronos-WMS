/**
 * Plan 03 · fase 1: esquemas y valores por defecto de cada sección de la configuración por cliente (§2.1). Se validan
 * al guardar (`.strict()`: un campo desconocido es un 400) y al leer (si una fila no valida se usan los valores por
 * defecto, para que una configuración rota nunca impida arrancar).
 */
import { z } from "zod";

export const SECCIONES = ["marca", "correo", "reportes", "regional"] as const;
export type Seccion = (typeof SECCIONES)[number];

/** Versión del esquema de cada sección (se guarda en `configuracion.esquema` para migrar el JSON más adelante). */
export const VERSION_ESQUEMA: Record<Seccion, number> = { marca: 1, correo: 1, reportes: 1, regional: 1 };

const texto = (max: number) => z.string().trim().max(max);
const correo = z.string().trim().email().max(150);
const url = z.string().trim().url().max(500).refine((u) => /^https?:\/\//i.test(u), "Solo URLs http(s)");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");
const idArchivo = z.number().int().positive().nullable().optional();

export const marcaSchema = z
  .object({
    nombreApp: texto(60).min(1),
    nombreCorto: texto(30).min(1),
    organizacion: texto(120),
    textoBienvenida: texto(200),
    textoAyudaLogin: texto(300),
    soporteCorreo: correo,
    soporteTelefono: texto(40).optional(),
    avisoPrivacidadUrl: url.optional(),
    creditoProveedor: z.object({ texto: texto(80), url: url, visible: z.boolean() }).strict(),
    logoId: idArchivo,
    faviconId: idArchivo,
    tema: z
      .object({ colorPrimario: color, colorEnlaceHover: color, fuente: texto(60).min(1), radio: z.number().int().min(0).max(16) })
      .strict(),
  })
  .strict();

/** Tipos de plantilla de correo y las variables que admite cada texto (`{{variable}}`). */
export const TIPOS_PLANTILLA = ["nuevoUsuario", "nuevoPassword", "reporteAnexo", "reporteDescarga", "alerta"] as const;
export const VARIABLES_PLANTILLA = [
  "nombreApp",
  "organizacion",
  "soporteCorreo",
  "correo",
  "clave",
  "horas",
  "archivo",
  "enlace",
  "alerta",
] as const;

/** Variables `{{x}}` que aparecen en un texto. */
export const variablesDe = (texto: string) => [...texto.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)].map((m) => m[1]);

const textoPlantilla = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .superRefine((t, ctx) => {
      const desconocidas = variablesDe(t).filter((v) => !(VARIABLES_PLANTILLA as readonly string[]).includes(v));
      if (desconocidas.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `Variables desconocidas: ${desconocidas.join(", ")}. Admitidas: ${VARIABLES_PLANTILLA.join(", ")}`,
        });
      }
    });

const plantilla = z.object({ asunto: textoPlantilla(200), cuerpo: textoPlantilla(10_000) }).strict();

/** Transporte SMTP tal como se GUARDA (con la contraseña cifrada). */
const transporteGuardado = z
  .object({
    host: texto(255).min(1),
    puerto: z.number().int().min(1).max(65535),
    seguro: z.boolean(),
    usuario: texto(255).optional(),
    contrasenaCifrada: z.string().max(2000).optional(),
    cabeceras: z.record(z.string().regex(/^[A-Za-z0-9-]{1,60}$/), z.string().max(500)).optional(),
  })
  .strict();

export const correoSchema = z
  .object({
    /** Sin transporte se usa el de las variables de entorno (`SMTP_*`). */
    transporte: transporteGuardado.nullable(),
    remitente: z.object({ nombre: texto(80).min(1), correo: correo.optional() }).strict(),
    soporteCorreo: correo.optional(),
    plantillas: z.object(Object.fromEntries(TIPOS_PLANTILLA.map((t) => [t, plantilla.optional()]))).strict(),
  })
  .strict();

/**
 * Cuerpo de `PUT /config/correo`: igual que lo guardado, pero la contraseña llega en claro y es solo de escritura:
 * ausente = se conserva la guardada; `null` = se borra; texto = se cifra con `CONFIG_CLAVE`.
 */
export const correoEntradaSchema = correoSchema.extend({
  transporte: transporteGuardado
    .omit({ contrasenaCifrada: true })
    .extend({ contrasena: z.string().min(1).max(500).nullable().optional() })
    .strict()
    .nullable(),
});

export const reportesSchema = z.object({ logoId: idArchivo, encabezado: texto(120).optional() }).strict();

export const regionalSchema = z
  .object({
    monedaPorDefecto: z.string().regex(/^[A-Z]{3}$/),
    monedas: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).max(10),
    locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
    zonaHoraria: texto(60).min(1),
  })
  .strict()
  .refine((r) => r.monedas.includes(r.monedaPorDefecto), "La moneda por defecto debe estar en la lista de monedas");

export const ESQUEMAS = { marca: marcaSchema, correo: correoSchema, reportes: reportesSchema, regional: regionalSchema } as const;

export type ConfigMarca = z.infer<typeof marcaSchema>;
export type ConfigCorreo = z.infer<typeof correoSchema>;
export type ConfigCorreoEntrada = z.infer<typeof correoEntradaSchema>;
export type ConfigReportes = z.infer<typeof reportesSchema>;
export type ConfigRegional = z.infer<typeof regionalSchema>;
export interface Configuraciones {
  marca: ConfigMarca;
  correo: ConfigCorreo;
  reportes: ConfigReportes;
  regional: ConfigRegional;
}

/** Valores por defecto del producto: "Chronos WMS" (P3). */
export const POR_DEFECTO: Configuraciones = {
  marca: {
    nombreApp: "Chronos WMS",
    nombreCorto: "Chronos WMS",
    organizacion: "",
    textoBienvenida: "Bienvenido a Chronos WMS",
    textoAyudaLogin: "Si no recuerda su acceso, por favor comuníquese con el administrador del sistema",
    soporteCorreo: "soporte@exogrid.io",
    creditoProveedor: { texto: "EXOGRID TECHNOLOGY", url: "https://exogrid.io/software", visible: true },
    tema: { colorPrimario: "#4b7cf3", colorEnlaceHover: "#42baf9", fuente: "Mukta", radio: 2 },
  },
  correo: { transporte: null, remitente: { nombre: "Chronos WMS" }, plantillas: {} },
  reportes: {},
  regional: { monedaPorDefecto: "MXN", monedas: ["MXN", "USD"], locale: "es-MX", zonaHoraria: "America/Mexico_City" },
};
