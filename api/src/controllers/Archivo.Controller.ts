import { In } from "typeorm";
import { join } from "path";
import { NextFunction, Request, Response } from "express";
import { readFileSync } from "fs";
import { access, rename } from "fs/promises";
import sharp from 'sharp';
import { AppDataSource } from "../data-source";
import { Archivo } from "../entity/Archivo";
import { InventarioActual } from "../entity/InventarioActual";
import { AppError } from "../helpers/errorClases";
import CommonController from "./common/Common.Controller";
import { esImagen, extensionSegura, nombreArchivoSeguro } from "../helpers/archivosSeguros";
import { idSeguro, parametro, parametroOpcional } from "../helpers/ids";
import { escribirAtomico, olvidarArchivoEnCache, rutaTemporal } from "../helpers/cacheArchivos";
import { Grupo } from "../entity/Grupo";
import { Operacion } from "../entity/Operacion";
import { Producto } from "../entity/Producto";
import { Proveedor } from "../entity/Proveedor";
import { Proyecto } from "../entity/Proyecto";
import { Usuario } from "../entity/Usuario";

/** Entidades a las que el cliente puede adjuntar archivos/comentarios. Antes `getRepository(relacion)` aceptaba cualquier nombre (hallazgo H3). */
export const RELACIONES_PERMITIDAS: Record<string, any> = { Grupo, Operacion, Producto, Proveedor, Proyecto, Usuario };
export const repositorioDeRelacion = (relacion: unknown) => {
  if (typeof relacion !== "string" || !RELACIONES_PERMITIDAS[relacion]) {
    throw new AppError(`Relación no permitida: ${String(relacion)}`, 400);
  }
  return AppDataSource.getRepository(RELACIONES_PERMITIDAS[relacion]);
};

/** 15 MiB (antes el límite era 16 000 000 bytes y el mensaje decía 15 MB; hallazgo L4). Lo usa también multer. */
export const TAMANO_MAXIMO_ARCHIVO = 15 * 1024 * 1024;

const existe = (ruta: string) => access(ruta).then(() => true).catch(() => false);



interface ResponseFile {
  uid: string,
  name: string,
  status: string,
  url: string,
  thumbUrl: string,
  type: string,
}

/**
 * Materializa el BLOB en disco (caché) y devuelve la ruta. El nombre en disco se construye con el id y la
 * extensión derivada del tipo MIME, nunca con el nombre que subió el usuario (hallazgo H2: recorrido de rutas).
 */
const obtenerGenerarArchivo = async (archivoId: number | string): Promise<string> => {
  const archivo = await AppDataSource.getRepository(Archivo).findOneByOrFail({ id: idSeguro(archivoId, "archivoId") });
  const RUTA_ARCHIVO = process.env.RUTA_ARCHIVOS;
  if (RUTA_ARCHIVO === undefined) throw new AppError("RUTA ARCHIVO indefinida");

  const fileName = join(RUTA_ARCHIVO, `${archivo.id}${extensionSegura(archivo.tipoMIME, archivo.nombre)}`);
  if (!(await existe(fileName))) {
    await escribirAtomico(fileName, archivo.data); // temporal + rename: nunca se sirve a medio escribir (M17)
  }
  return fileName;
};

/** Las miniaturas solo se generan para imágenes; otros tipos respondían 500 desde sharp (hallazgo M17). */
const asegurarImagen = async (archivoId: number | string) => {
  const archivo = await AppDataSource.getRepository(Archivo).findOne({ where: { id: idSeguro(archivoId, "archivoId") },  select: { id: true, tipoMIME: true } });
  if (!archivo || !esImagen(archivo.tipoMIME)) {
    throw new AppError("El archivo no es una imagen", 400);
  }
};

/** Estructura que espera el componente Upload de antd. La miniatura se decide por tipo MIME (hallazgo M16). */
const respuestaArchivo = (archivo: Archivo): ResponseFile => ({
  uid: (archivo.id * -1).toString(10),
  name: archivo.nombre,
  status: "done",
  url: `${process.env.API_ALMACEN}/file/${archivo.id}`,
  thumbUrl: esImagen(archivo.tipoMIME) ? `${process.env.API_ALMACEN}/file/thumbnail/${archivo.id}` : "",
  type: archivo.tipoMIME,
});

class ArchivoController {
  static guardar = async (
    file: any,
    sesionId: number,
    tipo: string = "",
    orden: number = 0,
    nota: string = ""
  ) => {
    if (!file) {
      throw new AppError("No se recibió ningún archivo", 400);
    }
    if (file.size > TAMANO_MAXIMO_ARCHIVO) {
      throw new AppError(
        `ARCHIVO DEMASIADO GRANDE. EL ARCHIVO NO PUEDE SOBREPASAR DE LOS ${TAMANO_MAXIMO_ARCHIVO / (1024 * 1024)}MB`,
        400
      );
    }

    const archivo = new Archivo();
    archivo.nombre = nombreArchivoSeguro(file.originalname);
    archivo.sesionId = sesionId;
    archivo.tipoMIME = file.mimetype;
    archivo.tipo = tipo;
    archivo.orden = orden;
    archivo.nota = nota;

    if (file.path !== undefined) {
      archivo.data = readFileSync(file.path);
    } else {
      archivo.data = file.buffer;
    }
    await AppDataSource.getRepository(Archivo).save(archivo);

    const rf: ResponseFile = respuestaArchivo(archivo);

    return {
      id: archivo.id,
      rf,
      archivo,
    };
  };

  static quitar = async (archivo: Archivo, sesionId: number) => {
    // const archivo = await getRepository(Archivo).findOneOrFail(archivoId);
    archivo.sesionId = sesionId;
    const id = archivo.id;
    const quitado = await AppDataSource.getRepository(Archivo).remove(archivo);
    await olvidarArchivoEnCache(process.env.RUTA_ARCHIVOS, id); // no dejar copias en disco de un archivo borrado
    return quitado;
  };

  static borrar = async (req: Request, res: Response, next: NextFunction) => {
    const archivoId = idSeguro(parametroOpcional(req, "id") ?? req.body?.archivoId, "archivoId");
    const { jwtPayload } = res.locals;
    try {
      await ArchivoController.quitar(await AppDataSource.getRepository(Archivo).findOneByOrFail({ id: archivoId }), jwtPayload.si);
      res.json();
    } catch (error) {
      next(error);
    }
  };

  static obtenerId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      res.sendFile(await obtenerGenerarArchivo(id));
    } catch (error) {
      next(error);
    }
  };

  static obtenerThumbnailId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      const nombreArchivo = await obtenerGenerarArchivo(id);
      const nuevoNombreArchivo = `${nombreArchivo}-thumbnail`;
      if (!(await existe(nuevoNombreArchivo))) {
        await asegurarImagen(id);
        const temporal = rutaTemporal(nuevoNombreArchivo);
        await sharp(nombreArchivo)
          .resize(64, 64)
          .withMetadata()
          .toFile(temporal);
        await rename(temporal, nuevoNombreArchivo);
      }
      res.sendFile(nuevoNombreArchivo);
    } catch (error) {
      next(error);
    }
  };

  static obtenerCatagoloId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      const splitId = id.split(".");
      const nombreArchivo = await obtenerGenerarArchivo(splitId[0]);
      const nuevoNombreArchivo = `${nombreArchivo}-catalog`;
      if (!(await existe(nuevoNombreArchivo))) {
        await asegurarImagen(splitId[0]);
        const temporal = rutaTemporal(nuevoNombreArchivo);
        await sharp(nombreArchivo)
          .resize(300, 300, { fit: "contain" })
          .withMetadata()
          .toFile(temporal);
        await rename(temporal, nuevoNombreArchivo);
      }
      res.sendFile(nuevoNombreArchivo);
    } catch (error) {
      next(error);
    }
  };

  static obtenerValidacionId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const id = parametro(req, "id");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      const splitId = id.split(".");
      const nombreArchivo = await obtenerGenerarArchivo(splitId[0]);
      const nuevoNombreArchivo = `${nombreArchivo}-review`;
      if (!(await existe(nuevoNombreArchivo))) {
        await asegurarImagen(splitId[0]);
        const temporal = rutaTemporal(nuevoNombreArchivo);
        await sharp(nombreArchivo)
          .resize(600, 600, { fit: "contain" })
          .withMetadata()
          .toFile(temporal);
        await rename(temporal, nuevoNombreArchivo);
      }
      res.sendFile(nuevoNombreArchivo);
    } catch (error) {
      next(error);
    }
  };

  static obtenerIdsPorInventarioId = async (id: number | string) => {
    // const id = parametro(req, "id");
    const inventarioActual = await AppDataSource.getRepository(InventarioActual)
      .createQueryBuilder("inventarioActual")
      .innerJoin("inventarioActual.producto", "producto")
      .leftJoin("producto.archivos", "archivos")
      .addSelect("archivos.id")
      .where("inventarioActual.id = :id", { id })
      .getOne();
    // findOneOrFail(id,{relations:["producto"]})
    if (inventarioActual == null)
      throw new AppError("Inventario acutal indefinidos");

    return inventarioActual.producto.archivos;
  };

  static obtenerResponseFileDeId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { ids } = req.body;
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      const archivos = await AppDataSource.getRepository(Archivo).findBy({ id: In(ids) });
      const respuestaArchivos: ResponseFile[] = archivos.map(respuestaArchivo);
      res.json(respuestaArchivos);
    } catch (error) {
      next(error);
    }
  };

  static agregarArchivo = async (
    req: any,
    res: Response,
    next: NextFunction
  ) => {
    const { file } = req;
    const { id, relacion } = req.body;
    const { jwtPayload } = res.locals;
    try {
      res.json(
        await CommonController.agregarArchivo(
          repositorioDeRelacion(relacion),
          id,
          jwtPayload.si,
          file
        )
      );
    } catch (error) {
      next(error);
    }
  };

  static quitarArchivo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id, archivoId, relacion } = req.body;
    const { jwtPayload } = res.locals;
    try {
      await CommonController.quitarArchivo(
        repositorioDeRelacion(relacion),
        id,
        jwtPayload.si,
        archivoId
      );
      res.json();
    } catch (error) {
      next(error);
    }
  };

  static obtenerReporte = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Solo el nombre base, servido desde la carpeta de reportes como raíz (hallazgo C4: recorrido de rutas).
      const nombreArchivo = nombreArchivoSeguro(parametro(req, "id"));
      const raiz = process.env.RUTA_REPORTES;
      if (!raiz) throw new AppError("RUTA_REPORTES indefinida");
      if (!(await existe(join(raiz, nombreArchivo)))) {
        throw new AppError("El reporte no existe", 404);
      }
      res.sendFile(nombreArchivo, { root: raiz, dotfiles: "deny" });
    } catch (error) {
      next(error);
    }
  };
};

export default ArchivoController;