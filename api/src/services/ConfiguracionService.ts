/**
 * Configuración por cliente (plan 03 §2.1-2.3). Lee cada sección validada con su esquema zod (si falta o no valida:
 * valores por defecto de Chronos WMS y un `warn`, nunca un error), la guarda con bloqueo optimista (`version` → 409)
 * y trata la contraseña SMTP como secreto: se guarda cifrada con `CONFIG_CLAVE` y nunca sale en una respuesta.
 *
 * Caché en memoria de 30 s por sección, invalidada al guardar: con varias instancias del API, las demás ven el cambio
 * en ≤ 30 s.
 */
import sharp, { Sharp } from "sharp";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { Archivo } from "../entity/Archivo";
import { Configuracion } from "../entity/Configuracion";
import {
  ConfigCorreo,
  ConfigCorreoEntrada,
  Configuraciones,
  correoEntradaSchema,
  ESQUEMAS,
  POR_DEFECTO,
  SECCIONES,
  Seccion,
  VERSION_ESQUEMA,
} from "../esquemas/configuracion";
import { cifrar, descifrar } from "../helpers/cifrado";
import { AppError } from "../helpers/errorClases";
import { logger } from "../helpers/logger";

const VIGENCIA_CACHE_MS = 30_000;

/** Destinos de las imágenes de marca: sección, campo con el id del `Archivo`, `tipo` del archivo y normalización. */
export const DESTINOS_IMAGEN = {
  logo: { seccion: "marca", campo: "logoId", tipo: "MARCA-LOGO", normalizar: (s: Sharp) => s.resize(512, 512, { fit: "inside", withoutEnlargement: true }) },
  favicon: { seccion: "marca", campo: "faviconId", tipo: "MARCA-FAVICON", normalizar: (s: Sharp) => s.resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }) },
  reportes: { seccion: "reportes", campo: "logoId", tipo: "REPORTES-LOGO", normalizar: (s: Sharp) => s.resize(512, 256, { fit: "inside", withoutEnlargement: true }) },
} as const;
export type DestinoImagen = keyof typeof DESTINOS_IMAGEN;

/** Formatos de imagen aceptados. SVG no (riesgo de XSS al servirlo sin token); ICO tampoco (sharp no lo lee). */
const FORMATOS_ACEPTADOS = new Set(["png", "jpeg", "webp"]);

/** Formato de exportación (plan 03, fase 5): secciones sin secretos e imágenes en base64. */
const exportacionSchema = z
  .object({
    formato: z.literal("chronos-wms-config"),
    version: z.literal(1),
    exportado: z.string().optional(),
    secciones: z.object({ marca: z.unknown().optional(), correo: z.unknown().optional(), reportes: z.unknown().optional(), regional: z.unknown().optional() }).strict(),
    imagenes: z.object({ logo: z.string().optional(), favicon: z.string().optional(), reportes: z.string().optional() }).strict().optional(),
  })
  .strict();

export interface SeccionLeida<S extends Seccion> {
  valor: Configuraciones[S];
  /** 0 si la fila no existe (valores por defecto). */
  version: number;
}

const cache = new Map<Seccion, { leida: SeccionLeida<Seccion>; hasta: number }>();

export const esSeccion = (valor: unknown): valor is Seccion => typeof valor === "string" && (SECCIONES as readonly string[]).includes(valor);

/** Correo tal como lo ve el administrador: sin la contraseña cifrada, con `tieneContrasena`. */
export const correoParaRespuesta = (correo: ConfigCorreo) => {
  if (!correo.transporte) return correo;
  const { contrasenaCifrada, ...transporte } = correo.transporte;
  return { ...correo, transporte: { ...transporte, tieneContrasena: Boolean(contrasenaCifrada) } };
};

/** Valor de una sección listo para una respuesta HTTP (sin secretos). */
export const paraRespuesta = <S extends Seccion>(seccion: S, valor: Configuraciones[S]) =>
  seccion === "correo" ? correoParaRespuesta(valor as ConfigCorreo) : valor;

/**
 * Convierte la entrada de `PUT /config/correo` en lo que se guarda: la contraseña en claro se cifra; ausente se
 * conserva la anterior; `null` la borra.
 */
export const correoParaGuardar = (entrada: ConfigCorreoEntrada, anterior: ConfigCorreo): ConfigCorreo => {
  if (!entrada.transporte) return { ...entrada, transporte: null };
  const { contrasena, ...transporte } = entrada.transporte;
  const contrasenaCifrada =
    contrasena === undefined ? anterior.transporte?.contrasenaCifrada : contrasena === null ? undefined : cifrar(contrasena);
  return { ...entrada, transporte: { ...transporte, ...(contrasenaCifrada ? { contrasenaCifrada } : {}) } };
};

export default class ConfiguracionService {
  static leer = async <S extends Seccion>(seccion: S): Promise<SeccionLeida<S>> => {
    const enCache = cache.get(seccion);
    if (enCache && enCache.hasta > Date.now()) return enCache.leida as SeccionLeida<S>;

    let leida: SeccionLeida<S> = { valor: POR_DEFECTO[seccion], version: 0 };
    try {
      const fila = await AppDataSource.getRepository(Configuracion).findOneBy({ seccion });
      if (!fila) {
        logger.warn(`Configuración: falta la sección "${seccion}"; se usan los valores por defecto`);
      } else {
        const validado = ESQUEMAS[seccion].safeParse(fila.valor);
        if (validado.success) leida = { valor: validado.data as Configuraciones[S], version: fila.version };
        else {
          logger.warn(`Configuración: la sección "${seccion}" no valida; se usan los valores por defecto`, validado.error.issues);
          leida = { valor: POR_DEFECTO[seccion], version: fila.version };
        }
      }
    } catch (error) {
      logger.warn(`Configuración: no se pudo leer "${seccion}"; se usan los valores por defecto`, (error as Error).message);
      return leida; // sin caché: se reintenta en la siguiente lectura
    }
    cache.set(seccion, { leida, hasta: Date.now() + VIGENCIA_CACHE_MS });
    return leida;
  };

  static leerTodas = async () => {
    const leidas = await Promise.all(SECCIONES.map((s) => ConfiguracionService.leer(s)));
    return Object.fromEntries(
      SECCIONES.map((s, i) => [s, { valor: paraRespuesta(s, leidas[i].valor), version: leidas[i].version }])
    ) as Record<Seccion, { valor: unknown; version: number }>;
  };

  /** Lo público (pantalla de login): marca, regional, URLs de imágenes y una versión para el ETag. */
  static publica = async () => {
    const [marca, regional] = await Promise.all([ConfiguracionService.leer("marca"), ConfiguracionService.leer("regional")]);
    const { logoId, faviconId, ...datosMarca } = marca.valor;
    return {
      marca: datosMarca,
      regional: regional.valor,
      logoUrl: logoId ? `/config/public/logo?v=${logoId}` : null,
      faviconUrl: faviconId ? `/config/public/favicon?v=${faviconId}` : null,
      version: `m${marca.version}-r${regional.version}-l${logoId ?? 0}-f${faviconId ?? 0}`,
    };
  };

  /**
   * Reemplaza una sección. `cuerpo` es el JSON recibido (sin validar). `versionEsperada` debe ser la versión leída por
   * quien edita: si otra persona guardó antes, 409 con la versión actual.
   */
  static guardar = async (seccion: Seccion, cuerpo: unknown, versionEsperada: unknown, sesionId: number) => {
    if (!Number.isInteger(versionEsperada)) throw new AppError("Falta la versión de la sección (version)", 400);
    const entrada = (seccion === "correo" ? correoEntradaSchema : ESQUEMAS[seccion]).safeParse(cuerpo);
    if (!entrada.success) {
      throw new AppError("Configuración inválida", 400, { errores: entrada.error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })) });
    }
    const guardada = await AppDataSource.transaction("READ COMMITTED", async (manager) => {
      const repo = manager.getRepository(Configuracion);
      const fila = await repo.createQueryBuilder("c").setLock("pessimistic_write").where("c.seccion = :seccion", { seccion }).getOne();
      const versionActual = fila?.version ?? 0;
      if (versionActual !== versionEsperada) {
        throw new AppError("Otra persona cambió esta sección. Recárgala y vuelve a aplicar tus cambios", 409, { version: versionActual });
      }
      const anterior = (fila ? ESQUEMAS[seccion].safeParse(fila.valor) : undefined)?.data ?? POR_DEFECTO[seccion];
      const valor =
        seccion === "correo" ? correoParaGuardar(entrada.data as ConfigCorreoEntrada, anterior as ConfigCorreo) : entrada.data;
      const registro = fila ?? repo.create({ seccion });
      registro.valor = valor;
      registro.esquema = VERSION_ESQUEMA[seccion];
      registro.sesionId = sesionId;
      return repo.save(registro);
    });
    cache.delete(seccion);
    logger.info(`Configuración: sección "${seccion}" guardada (versión ${guardada.version})`);
    return { valor: paraRespuesta(seccion, guardada.valor as Configuraciones[typeof seccion]), version: guardada.version };
  };

  /** Cambia campos de una sección sin comprobar la versión (subida de imágenes: un solo campo, sin conflicto real). */
  static actualizarCampos = async <S extends Exclude<Seccion, "correo">>(
    seccion: S,
    cambios: Partial<Configuraciones[S]>,
    sesionId: number
  ): Promise<{ valor: unknown; version: number }> => {
    const { valor, version } = await ConfiguracionService.leer(seccion);
    cache.delete(seccion);
    return ConfiguracionService.guardar(seccion, { ...valor, ...cambios }, version, sesionId).catch((error) => {
      if (error instanceof AppError && error.statusCode === 409) {
        cache.delete(seccion);
        return ConfiguracionService.actualizarCampos(seccion, cambios, sesionId); // se reintenta con la versión nueva
      }
      throw error;
    });
  };

  /** Contraseña SMTP en claro (solo para construir el transporte; fase 2). `null` si no hay o no se puede descifrar. */
  static contrasenaSmtp = async () => {
    const { valor } = await ConfiguracionService.leer("correo");
    const sobre = valor.transporte?.contrasenaCifrada;
    return sobre ? descifrar(sobre) : null;
  };

  /**
   * Guarda una imagen de marca: comprueba que sea PNG/JPEG/WebP (por su contenido, no por el nombre), la normaliza a
   * PNG, la asigna a su sección y borra la anterior. Devuelve la sección actualizada.
   */
  static guardarImagen = async (destino: DestinoImagen, datos: Buffer, sesionId: number) => {
    const { seccion, campo, tipo, normalizar } = DESTINOS_IMAGEN[destino];
    let png: Buffer;
    try {
      const { format } = await sharp(datos).metadata();
      if (!format || !FORMATOS_ACEPTADOS.has(format)) throw new Error(String(format));
      png = await normalizar(sharp(datos)).png().toBuffer();
    } catch {
      throw new AppError("Formato no admitido: usa una imagen PNG, JPEG o WebP", 400);
    }
    const repo = AppDataSource.getRepository(Archivo);
    const nuevo = await repo.save(Object.assign(new Archivo(), { data: png, nombre: `${destino}.png`, tipoMIME: "image/png", tipo, sesionId }));
    const { valor } = await ConfiguracionService.leer(seccion);
    const anterior = (valor as Record<string, unknown>)[campo];
    const resultado = await ConfiguracionService.actualizarCampos(seccion, { [campo]: nuevo.id }, sesionId);
    if (typeof anterior === "number") {
      const viejo = await repo.findOneBy({ id: anterior, tipo });
      if (viejo) await repo.remove(Object.assign(viejo, { sesionId }));
    }
    return resultado;
  };

  /** `GET /config/export`: todas las secciones SIN secretos e imágenes en base64, para otro entorno o cliente. */
  static exportar = async () => {
    const [marca, correo, reportes, regional] = await Promise.all(SECCIONES.map((s) => ConfiguracionService.leer(s)));
    const imagen = async (id: number | null | undefined, tipo: string) => {
      const archivo = id ? await AppDataSource.getRepository(Archivo).findOneBy({ id, tipo }) : null;
      return archivo ? Buffer.from(archivo.data).toString("base64") : undefined;
    };
    const { logoId, faviconId, ...datosMarca } = marca.valor as Configuraciones["marca"];
    const { logoId: logoReportesId, ...datosReportes } = reportes.valor as Configuraciones["reportes"];
    const datosCorreo = correo.valor as ConfigCorreo;
    const imagenes = {
      logo: await imagen(logoId, DESTINOS_IMAGEN.logo.tipo),
      favicon: await imagen(faviconId, DESTINOS_IMAGEN.favicon.tipo),
      reportes: await imagen(logoReportesId, DESTINOS_IMAGEN.reportes.tipo),
    };
    return {
      formato: "chronos-wms-config" as const,
      version: 1 as const,
      exportado: new Date().toISOString(),
      secciones: {
        marca: datosMarca,
        // La contraseña nunca se exporta: al importar se conserva la del entorno de destino
        correo: datosCorreo.transporte ? { ...datosCorreo, transporte: (({ contrasenaCifrada: _c, ...t }) => t)(datosCorreo.transporte) } : datosCorreo,
        reportes: datosReportes,
        regional: regional.valor,
      },
      imagenes: Object.fromEntries(Object.entries(imagenes).filter(([, v]) => v !== undefined)),
    };
  };

  /**
   * `POST /config/import`: aplica una exportación. Valida todo antes de guardar nada (400 sin cambios si algo falla);
   * cada sección presente se reemplaza (con la versión actual: importar es una decisión explícita), las imágenes se
   * normalizan como una subida y la contraseña SMTP del destino se conserva.
   */
  static importar = async (cuerpo: unknown, sesionId: number) => {
    const envoltura = exportacionSchema.safeParse(cuerpo);
    if (!envoltura.success) {
      throw new AppError("Archivo de configuración inválido", 400, { errores: envoltura.error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })) });
    }
    const { secciones, imagenes = {} } = envoltura.data;
    // 1. Validar todas las secciones antes de tocar nada
    const errores: { campo: string; mensaje: string }[] = [];
    for (const seccion of SECCIONES) {
      const valor = secciones[seccion];
      if (valor === undefined) continue;
      const esquema = seccion === "correo" ? correoEntradaSchema : ESQUEMAS[seccion];
      const r = esquema.safeParse(valor);
      if (!r.success) errores.push(...r.error.issues.map((i) => ({ campo: `${seccion}.${i.path.join(".")}`, mensaje: i.message })));
    }
    if (errores.length) throw new AppError("Archivo de configuración inválido", 400, { errores });
    // 2. Guardar secciones (los ids de imagen del origen no valen aquí: se conservan los del destino hasta subir las nuevas)
    const importadas: Seccion[] = [];
    for (const seccion of SECCIONES) {
      const valor = secciones[seccion] as Record<string, unknown> | undefined;
      if (valor === undefined) continue;
      const actual = await ConfiguracionService.leer(seccion);
      const conservar =
        seccion === "marca"
          ? { logoId: (actual.valor as Configuraciones["marca"]).logoId, faviconId: (actual.valor as Configuraciones["marca"]).faviconId }
          : seccion === "reportes"
            ? { logoId: (actual.valor as Configuraciones["reportes"]).logoId }
            : {};
      cache.delete(seccion);
      await ConfiguracionService.guardar(seccion, { ...valor, ...Object.fromEntries(Object.entries(conservar).filter(([, v]) => v != null)) }, actual.version, sesionId);
      importadas.push(seccion);
    }
    // 3. Imágenes
    const imagenesImportadas: DestinoImagen[] = [];
    for (const destino of Object.keys(DESTINOS_IMAGEN) as DestinoImagen[]) {
      const base64 = imagenes[destino];
      if (!base64) continue;
      await ConfiguracionService.guardarImagen(destino, Buffer.from(base64, "base64"), sesionId);
      imagenesImportadas.push(destino);
    }
    logger.info(`Configuración importada: ${importadas.join(", ") || "-"}; imágenes: ${imagenesImportadas.join(", ") || "-"}`);
    return { importadas, imagenes: imagenesImportadas };
  };

  /** Solo pruebas: vacía la caché. */
  static olvidarCache = () => cache.clear();
}
