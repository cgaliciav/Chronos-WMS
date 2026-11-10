import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Archivo } from "../entity/Archivo";
import { AppError } from "../helpers/errorClases";
import { parametro } from "../helpers/ids";
import { ICONO_POR_DEFECTO } from "../recursos/iconoChronos";
import ConfiguracionService, { DESTINOS_IMAGEN, DestinoImagen, esSeccion } from "../services/ConfiguracionService";
import CorreoService from "../services/CorreoService";
import { Usuario } from "../entity/Usuario";

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
      const archivo = id ? await AppDataSource.getRepository(Archivo).findOneBy({ id, tipo: DESTINOS_IMAGEN[destino].tipo }) : null;
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

  /** `POST /config/correo/prueba`: correo de prueba al usuario que lo pide, con la configuración guardada. */
  static probarCorreo = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const usuario = await AppDataSource.getRepository(Usuario).findOneByOrFail({ id: res.locals.jwtPayload.ui });
      res.json(await CorreoService.enviarPrueba(usuario.correo));
    } catch (error) {
      next(error);
    }
  };

  /** `POST /config/marca/logo`, `/config/marca/favicon`, `/config/reportes/logo` (multipart `file`). */
  static subirImagen = (destino: DestinoImagen) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError("Falta la imagen (campo file)", 400);
      res.json(await ConfiguracionService.guardarImagen(destino, req.file.buffer, res.locals.jwtPayload.si));
    } catch (error) {
      next(error);
    }
  };

  /** `GET /config/export`: configuración sin secretos, con imágenes en base64 (descarga JSON). */
  static exportar = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.setHeader("Content-Disposition", 'attachment; filename="configuracion-chronos-wms.json"');
      res.json(await ConfiguracionService.exportar());
    } catch (error) {
      next(error);
    }
  };

  /** `POST /config/import`: aplica una exportación (todo o nada en la validación). */
  static importar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await ConfiguracionService.importar(req.body, res.locals.jwtPayload.si));
    } catch (error) {
      next(error);
    }
  };
}
