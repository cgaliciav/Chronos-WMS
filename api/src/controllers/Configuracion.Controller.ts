import { NextFunction, Request, Response } from "express";
import sharp, { Sharp } from "sharp";
import { AppDataSource } from "../data-source";
import { Archivo } from "../entity/Archivo";
import { AppError } from "../helpers/errorClases";
import { parametro } from "../helpers/ids";
import { ICONO_POR_DEFECTO } from "../recursos/iconoChronos";
import ConfiguracionService, { esSeccion } from "../services/ConfiguracionService";

/** Destinos de las imágenes de marca: sección, campo con el id del `Archivo`, `tipo` del archivo y cómo se normaliza. */
const DESTINOS = {
  logo: { seccion: "marca", campo: "logoId", tipo: "MARCA-LOGO", normalizar: (s: Sharp) => s.resize(512, 512, { fit: "inside", withoutEnlargement: true }) },
  favicon: { seccion: "marca", campo: "faviconId", tipo: "MARCA-FAVICON", normalizar: (s: Sharp) => s.resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }) },
  reportes: { seccion: "reportes", campo: "logoId", tipo: "REPORTES-LOGO", normalizar: (s: Sharp) => s.resize(512, 256, { fit: "inside", withoutEnlargement: true }) },
} as const;
type Destino = keyof typeof DESTINOS;

/** Formatos aceptados. SVG no (riesgo de XSS al servirlo sin token); ICO tampoco (sharp no lo lee). */
const MIME_ACEPTADOS = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Configuración por cliente (plan 03 §2.2): `/config`. */
export default class ConfiguracionController {
  /** `GET /config/public` (sin token): lo que necesita la pantalla de login. ETag + revalidación. */
  static publica = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const publica = await ConfiguracionService.publica();
      const etag = `W/"${publica.version}"`;
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "no-cache");
      if (req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
      }
      res.json(publica);
    } catch (error) {
      next(error);
    }
  };

  /** `GET /config/public/logo` y `/favicon` (sin token): solo archivos de marca; si no hay, el icono de Chronos WMS. */
  static imagenPublica = (destino: "logo" | "favicon") => async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { valor } = await ConfiguracionService.leer("marca");
      const id = destino === "logo" ? valor.logoId : valor.faviconId;
      const archivo = id ? await AppDataSource.getRepository(Archivo).findOneBy({ id, tipo: DESTINOS[destino].tipo }) : null;
      res.setHeader("Content-Type", archivo?.tipoMIME ?? "image/png");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      res.send(archivo?.data ?? ICONO_POR_DEFECTO);
    } catch (error) {
      next(error);
    }
  };

  /** `GET /config`: todas las secciones con su versión (la contraseña SMTP nunca sale: `tieneContrasena`). */
  static todas = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await ConfiguracionService.leerTodas());
    } catch (error) {
      next(error);
    }
  };

  /** `PUT /config/:seccion` `{ version, valor }`. */
  static guardar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const seccion = parametro(req, "seccion");
      if (!esSeccion(seccion)) throw new AppError(`Sección desconocida: ${seccion}`, 404);
      const { version, valor } = req.body;
      res.json(await ConfiguracionService.guardar(seccion, valor, version, res.locals.jwtPayload.si));
    } catch (error) {
      next(error);
    }
  };

  /** `POST /config/marca/logo`, `/config/marca/favicon`, `/config/reportes/logo` (multipart `file`). */
  static subirImagen = (destino: Destino) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const archivo = req.file;
      if (!archivo) throw new AppError("Falta la imagen (campo file)", 400);
      if (!MIME_ACEPTADOS.has(archivo.mimetype)) throw new AppError("Formato no admitido: usa PNG, JPEG o WebP", 400);
      const { seccion, campo, tipo, normalizar } = DESTINOS[destino];
      let png: Buffer;
      try {
        png = await normalizar(sharp(archivo.buffer)).png().toBuffer();
      } catch {
        throw new AppError("El archivo no es una imagen válida", 400);
      }
      const { si } = res.locals.jwtPayload;
      const repo = AppDataSource.getRepository(Archivo);
      const nuevo = await repo.save(
        Object.assign(new Archivo(), { data: png, nombre: `${destino}.png`, tipoMIME: "image/png", tipo, sesionId: si })
      );
      const { valor } = await ConfiguracionService.leer(seccion);
      const anterior = (valor as Record<string, unknown>)[campo];
      const resultado = await ConfiguracionService.actualizarCampos(seccion, { [campo]: nuevo.id }, si);
      // La imagen anterior ya no la usa nadie (solo se borran archivos de marca de ese tipo)
      if (typeof anterior === "number") {
        const viejo = await repo.findOneBy({ id: anterior, tipo });
        if (viejo) await repo.remove(Object.assign(viejo, { sesionId: si }));
      }
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };
}
