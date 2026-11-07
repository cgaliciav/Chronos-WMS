import { join } from "path";
import { NextFunction, Request, Response } from "express";
import { existsSync, readFileSync } from "fs";
import { access, writeFile } from "fs/promises";
import sharp from 'sharp';
import { getRepository } from "typeorm";
import { Archivo } from "../entity/Archivo";
import { InventarioActual } from "../entity/InventarioActual";
import { AppError } from "../helpers/errorClases";
import CommonController from "./common/Common.Controller";
import { esImagen, extensionSegura, nombreArchivoSeguro } from "../helpers/archivosSeguros";
import { idSeguro } from "../helpers/ids";
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
  return getRepository(RELACIONES_PERMITIDAS[relacion]);
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
  const archivo = await getRepository(Archivo).findOneOrFail(idSeguro(archivoId, "archivoId"));
  const RUTA_ARCHIVO = process.env.RUTA_ARCHIVOS;
  if (RUTA_ARCHIVO === undefined) throw new AppError("RUTA ARCHIVO indefinida");

  const fileName = join(RUTA_ARCHIVO, `${archivo.id}${extensionSegura(archivo.tipoMIME, archivo.nombre)}`);
  if (!(await existe(fileName))) {
    await writeFile(fileName, archivo.data);
  }
  return fileName;
};

/** Las miniaturas solo se generan para imágenes; otros tipos respondían 500 desde sharp (hallazgo M17). */
const asegurarImagen = async (archivoId: number | string) => {
  const archivo = await getRepository(Archivo).findOne(idSeguro(archivoId, "archivoId"), { select: ["id", "tipoMIME"] });
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
    await getRepository(Archivo).save(archivo);

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
    return await getRepository(Archivo).remove(archivo);
  };

  static borrar = async (req: Request, res: Response, next: NextFunction) => {
    const archivoId = idSeguro(req.params.id ?? req.body?.archivoId, "archivoId");
    const { jwtPayload } = res.locals;
    try {
      await ArchivoController.quitar(await getRepository(Archivo).findOneOrFail(archivoId), jwtPayload.si);
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
    const { id } = req.params;
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
    const { id } = req.params;
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      const nombreArchivo = await obtenerGenerarArchivo(id);
      const nuevoNombreArchivo = `${nombreArchivo}-thumbnail`;
      if (!existsSync(nuevoNombreArchivo)) {
        await asegurarImagen(id);
        const sharpResultado = await sharp(nombreArchivo)
          .resize(64, 64)
          .withMetadata()
          .toFile(nuevoNombreArchivo);
        // console.log('*****SHARP obtenerThumbnailId*******************',sharpResultado)
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
    const { id } = req.params;
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      const splitId = id.split(".");
      const nombreArchivo = await obtenerGenerarArchivo(splitId[0]);
      const nuevoNombreArchivo = `${nombreArchivo}-catalog`;
      if (!existsSync(nuevoNombreArchivo)) {
        await asegurarImagen(splitId[0]);
        const sharpResultado = await sharp(nombreArchivo)
          .resize(300, 300, { fit: "contain" })
          .withMetadata()
          .toFile(nuevoNombreArchivo);
        // console.log('*****SHARP obtenerCatagoloId*******************',sharpResultado)
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
    const { id } = req.params;
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    try {
      const splitId = id.split(".");
      const nombreArchivo = await obtenerGenerarArchivo(splitId[0]);
      const nuevoNombreArchivo = `${nombreArchivo}-review`;
      if (!existsSync(nuevoNombreArchivo)) {
        await asegurarImagen(splitId[0]);
        const sharpResultado = await sharp(nombreArchivo)
          .resize(600, 600, { fit: "contain" })
          .withMetadata()
          .toFile(nuevoNombreArchivo);
        // console.log('*****SHARP obtenerCatagoloId*******************',sharpResultado)
      }
      res.sendFile(nuevoNombreArchivo);
    } catch (error) {
      next(error);
    }
  };

  static obtenerIdsPorInventarioId = async (id: number | string) => {
    // const {id} = req.params;
    const inventarioActual = await getRepository(InventarioActual)
      .createQueryBuilder("inventarioActual")
      .innerJoin("inventarioActual.producto", "producto")
      .leftJoin("producto.archivos", "archivos")
      .addSelect("archivos.id")
      .where("inventarioActual.id = :id", { id })
      .getOne();
    // findOneOrFail(id,{relations:["producto"]})
    if (inventarioActual === undefined)
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
      const archivos = await getRepository(Archivo).findByIds(ids);
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
      const nombreArchivo = nombreArchivoSeguro(req.params.id);
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