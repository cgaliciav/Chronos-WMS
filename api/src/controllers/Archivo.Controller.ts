import { dirname, basename, extname, join } from "path";
import { NextFunction, Request, Response } from "express";
import { existsSync, readFileSync, writeFile } from "fs";
import sharp from 'sharp';
import { getRepository } from "typeorm";
import { Archivo } from "../entity/Archivo";
import { InventarioActual } from "../entity/InventarioActual";
import { AppError } from "../helpers/errorClases";
import CommonController from "./common/Common.Controller";



interface ResponseFile {
  uid: string,
  name: string,
  status: string,
  url: string,
  thumbUrl: string,
  type: string,
}

interface ResponseFileSupabase {
  image_url: string,
  image_url_thumbnail?: string,
  image_url_catalog?: string,
}

interface ResponseFileSupabase2 {
  file_path: string,
  file_type: string,
  image_url_thumbnail?: string,
  image_url_catalog?: string,
}

export const obtenerGenerarArchivoComentarioSupabase = async (archivoId: number | string): Promise<ResponseFileSupabase2> => {
  try {
    const archivo = await getRepository(Archivo).findOneOrFail(archivoId);

    // const uploadbBuffer = await sharp(archivo.data).jpeg({ quality: 100 }).withMetadata().toBuffer()  //toFile(`${fileName}-ORIGINAL.jpg`); // toBuffer(); // toFile(`${archivo.id}-ORIGINAL.jpg`);
    // const uploadbBuffer64 = await sharp(archivo.data).resize(64).jpeg().withMetadata().toBuffer(); //toFile(`${fileName}-64.jpg`);
    // const uploadbBuffer300 = await sharp(archivo.data).resize(300).jpeg().withMetadata().toBuffer(); //toFile(`${fileName}-300.jpg`);
    //upload a file to a bucket




    const validFileName = archivo.nombre.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    // const { error } = await supabase.storage.from('comments-attachments').upload(`${archivo.id}-${validFileName}`, archivo.data, { contentType: archivo.tipoMIME, upsert:true, metadata: { "originalFileName": archivo.nombre } });
    // const { error: error64 } = await supabase.storage.from('products-images').upload(`thumbnail/${archivo.id}.jpg`, uploadbBuffer64, { contentType: 'image/jpeg' });
    // const { error: error300 } = await supabase.storage.from('products-images').upload(`catalog/${archivo.id}.jpg`, uploadbBuffer300, { contentType: 'image/jpeg' });

    // if (error /* || error64 || error300 */) {
    //   console.error('Error uploading file: ', { archivoId, error: error.message /*, error64, error300 */ });
    //   throw new AppError("Error al subir archivo", 501);
    // }
    // const { data: dataO } = supabase.storage.from('products-images').getPublicUrl(`${archivo.id}.jpg`);
    // const { data: dataT } = supabase.storage.from('products-images').getPublicUrl(`thumbnail/${archivo.id}.jpg`);
    // const { data: dataC } = supabase.storage.from('products-images').getPublicUrl(`catalog/${archivo.id}.jpg`);

    return {
      file_path: `${archivo.id}-${validFileName}`,
      file_type: archivo.tipoMIME,
      // image_url_thumbnail: dataT.publicUrl,
      // image_url_catalog: dataC.publicUrl
    };


  } catch (error) {
    console.log("Error al subir archivo", error);
    // throw new AppError("Error al subir archivo", 501);

  }

}


export const obtenerGenerarArchivoSupabase = async (archivoId: number | string): Promise<ResponseFileSupabase> => {
  try {
    const archivo = await getRepository(Archivo).findOneOrFail(archivoId);
    if (!archivo.tipoMIME.startsWith('image/')) {
      throw new AppError("El archivo no es una imagen", 400);
    }

    const uploadbBuffer = await sharp(archivo.data).jpeg({ quality: 100 }).withMetadata().toBuffer()  //toFile(`${fileName}-ORIGINAL.jpg`); // toBuffer(); // toFile(`${archivo.id}-ORIGINAL.jpg`);
    // const uploadbBuffer64 = await sharp(archivo.data).resize(64).jpeg().withMetadata().toBuffer(); //toFile(`${fileName}-64.jpg`);
    // const uploadbBuffer300 = await sharp(archivo.data).resize(300).jpeg().withMetadata().toBuffer(); //toFile(`${fileName}-300.jpg`);

    //upload a file to a bucket

    // const { error } = await supabase.storage.from('products-images').upload(`${archivo.id}.jpg`, uploadbBuffer, { contentType: 'image/jpeg', metadata: { "originalFileName": archivo.nombre } });
    // const { error: error64 } = await supabase.storage.from('products-images').upload(`thumbnail/${archivo.id}.jpg`, uploadbBuffer64, { contentType: 'image/jpeg' });
    // const { error: error300 } = await supabase.storage.from('products-images').upload(`catalog/${archivo.id}.jpg`, uploadbBuffer300, { contentType: 'image/jpeg' });

    // if (error /* || error64 || error300 */) {
    //   console.error('Error uploading file: ', { archivoId, error: error.message,  /*, error64, error300 */ });
    //   throw new AppError("Error al subir archivo", 501);
    // }

    // GET THE PUBLIC URL
    // const { data: dataO } = supabase.storage.from('products-images').getPublicUrl(`${archivo.id}.jpg`);
    // const { data: dataT } = supabase.storage.from('products-images').getPublicUrl(`thumbnail/${archivo.id}.jpg`);
    // const { data: dataC } = supabase.storage.from('products-images').getPublicUrl(`catalog/${archivo.id}.jpg`);

    return {
      image_url: `${archivo.id}.jpg`,
      // image_url_thumbnail: dataT.publicUrl,
      // image_url_catalog: dataC.publicUrl
    };


  } catch (error) {
    console.log("Error al subir archivo", error);
    // throw new AppError("Error al subir archivo", 501);

  }

}



const obtenerGenerarArchivo = (archivoId: number | string) => (
  new Promise<string>((resolve, reject) => {
    getRepository(Archivo)
      .findOneOrFail(archivoId)
      .then(async (archivo) => {
        const RUTA_ARCHIVO = process.env.RUTA_ARCHIVOS;
        if (RUTA_ARCHIVO === undefined)
          throw new AppError("RUTA ARCHIVO indefinida");

        const fileName = join(RUTA_ARCHIVO, `${archivo.id}-${archivo.nombre}`);

        if (!existsSync(fileName)) {
          writeFile(fileName, archivo.data, (err => {
            if (!err) {
              resolve(fileName);
            } else {
              console.log("Error al crear archivo", err);
              throw new AppError("Error al crear archivo", 501);
            }
          }))
        }
        else {
          resolve(fileName);
        }
      })
      .catch(error => {
        reject(error)
      })
  }))

class ArchivoController {
  static guardar = async (
    file: any,
    sesionId: number,
    tipo: string = "",
    orden: number = 0,
    nota: string = ""
  ) => {
    if (file.size > 16000000) {
      throw new AppError(
        "ARCHIVO DEMASIADO GRANDE. EL ARCHIVO NO PUEDE SOBREPASAR DE LOS 15MB",
        400
      );
    }

    const archivo = new Archivo();
    archivo.nombre = file.originalname;
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

    const rf: ResponseFile = {
      uid: (archivo.id * -1).toString(10),
      name: archivo.nombre,
      status: "done",
      url: `${process.env.API_ALMACEN}/file/${archivo.id}`,
      thumbUrl:
        archivo.tipo.toLowerCase().indexOf("image") >= 0
          ? `${process.env.API_ALMACEN}/file/thumbnail/${archivo.id}`
          : "",
      type: archivo.tipoMIME,
    };

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
    const { archivoId } = req.body;
    const { jwtPayload } = res.locals;
    try {
      ArchivoController.quitar(
        await getRepository(Archivo).findOneOrFail(archivoId),
        jwtPayload.si
      );
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
      // console.info("***************************************splitId",splitId,id)
      const nombreArchivo = await obtenerGenerarArchivo(splitId[0]);
      const nuevoNombreArchivo2 = join(dirname(nombreArchivo), `catalog-${id}`);
      const nuevoNombreArchivo = `${nombreArchivo}-catalog`;

      // const filename = nombreArchivo.replace(/^.*[\\\/]/, '')
      // console.info("***************************************nuevoNombreArchivo",{nuevoNombreArchivo,nuevoNombreArchivo2})
      // const nuevoNombreArchivo = `${id}`;
      if (!existsSync(nuevoNombreArchivo)) {
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
      // console.info("***************************************splitId",splitId,id)
      const nombreArchivo = await obtenerGenerarArchivo(splitId[0]);
      const nuevoNombreArchivo2 = join(dirname(nombreArchivo), `review-${id}`);
      const nuevoNombreArchivo = `${nombreArchivo}-review`;

      // const filename = nombreArchivo.replace(/^.*[\\\/]/, '')
      // console.info("***************************************nuevoNombreArchivo",{nuevoNombreArchivo,nuevoNombreArchivo2})
      // const nuevoNombreArchivo = `${id}`;
      if (!existsSync(nuevoNombreArchivo)) {
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
      const respuestaArchivos: ResponseFile[] = archivos.map((archivo) => ({
        uid: (archivo.id * -1).toString(10),
        name: archivo.nombre,
        status: "done",
        url: `${process.env.API_ALMACEN}/file/${archivo.id}`,
        thumbUrl:
          archivo.tipo.toLowerCase().indexOf("image") >= 0
            ? `${process.env.API_ALMACEN}/file/thumbnail/${archivo.id}`
            : "",
        type: archivo.tipoMIME,
      }));
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
          getRepository(relacion),
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
        getRepository(relacion),
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
    const { id: nombreArchivo } = req.params;

    try {
      // const nuevoNombreArchivo = `${id}`;
      const ruta = `${process.env.RUTA_REPORTES}${nombreArchivo}`;
      if (!existsSync(ruta)) {
        throw new AppError("El reporte no existe", 401);
      }
      res.sendFile(ruta);
    } catch (error) {
      next(error);
    }
  };
};

export default ArchivoController;