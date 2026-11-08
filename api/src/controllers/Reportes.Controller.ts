// import { fork, spawn } from "child_process"
import { Request, Response, NextFunction } from "express";
import { stat } from "fs";
import { getRepository } from "typeorm";

// import MagicBellClient, { Notification } from "@magicbell/core";

import { Usuario } from "../entity/Usuario";
import EnviarMail from "../helpers/enviarMail";
import { AppError } from "../helpers/errorClases";
import { MovimientoTipoId as T } from "../entity/common/MovimientoTipoId";
import {
  reportePorGrupo,
  reportePorProyecto,
  reportePorPrestamosRentasActivas,
  reportePorProyectoCompras,
  reporteGeneral, 
  reportePorGrupoFotoGrande
} from "../helpers/excelFunctions";
// import CommonController, { ResultadoTabla } from "./common/Common.Controller"
// import { funcionQueryListadoMovimientos,condicionesWhereAnd as grupoCondicionesWhereAnd } from "./Grupo.Controller"

/* 
TODO: DEJAR LOS REPORTES EN EL SERVIDOR POR 15 DÍAS... MANDAR LOS LINKS POR CORREO ELECTRÓNICO. 
    HACER EL CRON PARA BORRAR ARCHIVOS DE REPORTES CADA 15 DÍAS.
    HACER EL CRON PARA BORRAR FOTOS CON MÁS DE 30 DÍAS.

*/

// NPM package at https://www.npmjs.com/package/@magicbell/core
// yarn add @magicbell/core

const mandarArchivo = (
  correo: string,
  detalleArchivo: { path: string; nombreReporte: string }
) => {
  stat(detalleArchivo.path, async (err, filestats) => {

    // MagicBellClient.configure({
    //   apiKey: process.env.MAGICBELL_API_KEY,
    //   apiSecret: process.env.MAGICBELL_API_SECRET,
    // })

    if (err) {
      console.log(`No se puede leer el archivo: ${detalleArchivo.path}`, err);
      // await Notification.create({
      //   title: "ERROR al generar el reporte",
      //   content: `${detalleArchivo.nombreReporte}`,
      //   action_url: `${process.env.API_ALMACEN}/file/report/${detalleArchivo.nombreReporte}`,
      //   recipients: [{ email: correo }],
      // });

    } else {
      // DONE: MANDAR POR MAGICBELL

      // await Notification.create({
      //   title: "Reporte generado",
      //   content: `${detalleArchivo.nombreReporte}`,
      //   action_url: `${process.env.API_ALMACEN}/file/report/${detalleArchivo.nombreReporte}`,
      //   recipients: [{ email: correo }],
      // });

      if (filestats.size > 8 * 1024 * 1024) {
        console.log(
          "********mandarArchivo***************************************************************",
          { detalleArchivo }
        );
        EnviarMail.correorReporteDescarga(correo, {
          filename: `${detalleArchivo.nombreReporte}`,
          path: `${process.env.API_ALMACEN}/file/report/${detalleArchivo.nombreReporte}`,
        });
      } else {
        // adjuntar el archivo
        EnviarMail.correoConAnexos(correo, [
          { filename: "reporte.xlsx", path: detalleArchivo.path },
        ]);
      }
    }
  });
};

const funcionQueryReporteCierre = async (
  body: any,
  correo: string
) => {
  try {
    // const { proyectoId, conFoto } = body;
    console.log("---- funcionQueryReporteCierre ----", { body });
    const path = await reporteGeneral(body);
    console.log("************************ funcionQueryReporteCierre", {
      path,
    });
    mandarArchivo(correo, path);
  } catch (error) {
    console.log("************************ funcionQueryReporteCierre error", { error });
    // const client = new MagicBellClient({
    //   apiKey: process.env.MAGICBELL_API_KEY,
    //   apiSecret: process.env.MAGICBELL_API_SECRET,
    // });
    // const notifications = client.getStore();

    // const notification = await notifications.create({
    //   title: "ERROR. REPORTE NO GENERADO",
    //   content: `${error.message}`,
    //   // actionUrl: `${process.env.API_ALMACEN}/file/report/${detalleArchivo.nombreReporte}`,
    //   recipients: [{ email: correo }],
    // });
    // No se relanza: la promesa corre sin await y un rechazo tiraría el proceso (hallazgo H8).
    // En la fase 7 (notificaciones propias) se avisará al usuario del fallo.
  }
};

const funcionQueryMovimientosActivosReporteProyecto = async (
  body: any,
  correo: string
) => {
  try {
    const path = await reportePorPrestamosRentasActivas(body);
    console.log("************************funcionQueryMovimientosActivosReporteProyecto", {
      path,
    });
    mandarArchivo(correo, path);
  } catch (error) {
    console.log("************************funcionQueryMovimientosActivosReporteProyecto error", { error });
    // const client = new MagicBellClient({
    //   apiKey: process.env.MAGICBELL_API_KEY,
    //   apiSecret: process.env.MAGICBELL_API_SECRET,
    // });
    // const notifications = client.getStore();

    // const notification = await notifications.create({
    //   title: "ERROR. REPORTE NO GENERADO",
    //   content: `${error.message}`,
    //   // actionUrl: `${process.env.API_ALMACEN}/file/report/${detalleArchivo.nombreReporte}`,
    //   recipients: [{ email: correo }],
    // });
    // No se relanza: la promesa corre sin await y un rechazo tiraría el proceso (hallazgo H8).
    // En la fase 7 (notificaciones propias) se avisará al usuario del fallo.
  }
};

const funcionQueryMovimientosReporteProyecto = async (
  body: any,
  correo: string
) => {
  try {
    const condicion = (Array.isArray(body.movimientoTipoId) && body.movimientoTipoId.map(Number).includes(T.COMPRA));
    const path = condicion ? await reportePorProyectoCompras(body) : await reportePorProyecto(body);
    console.log(`************************funcionQueryMovimientosReporteProyecto${condicion ? "COMPRAS" : ""}`, {
      path,
    });
    mandarArchivo(correo, path);
  } catch (error) {
    console.log("************************funcionQueryMovimientosReporteProyecto error", { error });
    // const client = new MagicBellClient({
    //   apiKey: process.env.MAGICBELL_API_KEY,
    //   apiSecret: process.env.MAGICBELL_API_SECRET,
    // });
    // const notifications = client.getStore();

    // const notification = await notifications.create({
    //   title: "ERROR. REPORTE NO GENERADO",
    //   content: `${error.message}`,
    //   // actionUrl: `${process.env.API_ALMACEN}/file/report/${detalleArchivo.nombreReporte}`,
    //   recipients: [{ email: correo }],
    // });
    // No se relanza: la promesa corre sin await y un rechazo tiraría el proceso (hallazgo H8).
    // En la fase 7 (notificaciones propias) se avisará al usuario del fallo.
  }
};

const funcionGenerarReportePorGrupo = async (body: any, correo: string) => {
  try {
    const path = body.fotoGrande ? await reportePorGrupoFotoGrande(body) : await reportePorGrupo(body);
    console.log(`************************funcionGenerarReportePorGrupo ${body.fotoGrande ? "FOTO GRANDE" : ""}`, {
      path,
    });
    mandarArchivo(correo, path);
  } catch (error) {
    console.log("************************funcionGenerarReportePorGrupo error", { error });
    // const client = new MagicBellClient({
    //   apiKey: process.env.MAGICBELL_API_KEY,
    //   apiSecret: process.env.MAGICBELL_API_SECRET,
    // });
    // const notifications = client.getStore();
    // const notification = await notifications.create({
    //   title: "ERROR. REPORTE NO GENERADO",
    //   content: `${error.message}`,
    //   // actionUrl: `${process.env.API_ALMACEN}/file/report/${detalleArchivo.nombreReporte}`,
    //   recipients: [{ email: correo }],
    // });

    // No se relanza: la promesa corre sin await y un rechazo tiraría el proceso (hallazgo H8).
    // En la fase 7 (notificaciones propias) se avisará al usuario del fallo.
  }
};

const funcionQueryMovimientosGeneral = () => { };

const funcionQueryAntiguedadMovimientos = () => { };

class ReporteController {
  // TODO GENERAR REPORTE DE MOVIMINETOS (ALTAS, BAJAS, COMPRAS, ETC, (NO INVENTARIOS, ) POR FECHA)
  static reportePorGrupo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { ...body } = req.body;
    const { jwtPayload } = res.locals;

    try {
      jwtPayload.ui
      funcionGenerarReportePorGrupo(
        { ...body, nombreAlmacenista: jwtPayload.u },
        (
          await getRepository(Usuario).findOneOrFail(jwtPayload.ui, {
            select: ["id", "correo"],
            loadEagerRelations: false /*cache:true,*/,
          })
        ).correo
      );
      res.json({
        message:
          "El reporte se está generando. En breve recibirás un correo con el reporte solicitado",
      });
    } catch (error) {
      next(error);
    }
  };

  static reportePorProyecto = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { activos = false, ...body } = req.body;
    const { jwtPayload } = res.locals;

    try {
      if (activos) {
        console.log(
          "funcionQueryMovimientosActivosReporteProyecto----funcionQueryMovimientosActivosReporteProyecto",
          { activos, body }
        );
        funcionQueryMovimientosActivosReporteProyecto(
          body,
          (
            await getRepository(Usuario).findOneOrFail(jwtPayload.ui, {
              select: ["id", "correo"],
              loadEagerRelations: false /*cache:true,*/,
            })
          ).correo
        );
      } else {
        funcionQueryMovimientosReporteProyecto(
          body,
          (
            await getRepository(Usuario).findOneOrFail(jwtPayload.ui, {
              select: ["id", "correo"],
              loadEagerRelations: false /*cache:true,*/,
            })
          ).correo
        );
      }
      res.json({
        message:
          "El reporte se está generando. En breve recibirás un correo con el reporte solicitado",
      });
    } catch (error) {
      next(error);
    }
  };
  //TODO GENERAR REPORTE DE CIERRRE (COMPRAS, RENTAS, DEVOLUCIONES, BAJAS JUSTIFICADAS E INJUSTIFICADAS, HOJA RESUMEN,TODO EN UN ARCHIVO...)
  static reporteCierre = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // const  body = req.body;
    const { jwtPayload } = res.locals;

    try {
      console.log(
        "---- funcionQueryReporteCierre ----",
        { body: req.body }
      );
      funcionQueryReporteCierre(
        req.body,
        (
          await getRepository(Usuario).findOneOrFail(jwtPayload.ui, {
            select: ["id", "correo"],
            loadEagerRelations: false /*cache:true,*/,
          })
        ).correo
      );
      res.json({
        message:
          "El reporte se está generando. En breve recibirás un correo con el reporte solicitado",
      });
    } catch (error) {
      next(error);
    }

  };

  //TODO GENERAR REPORTE DE USO (CUANTO TIENE QUE SE REALIZÓ EL ULTIMO MOVIMIENTO QUE NO FUE INVENTARIO. EL ARTICULO NO DEBE ESTAR DADO DE BAJA)
  static reportePorUso = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte por uso no implementado", 501)); // antes la petición se quedaba colgada (hallazgo H9)
  };

  //TODO REPORTE DE GRUPODETALLE (LISTADO DE ARTICULOS)
  static reportePorGrupoDetalle = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte por detalle de grupo no implementado", 501));
  };

  //TODO REPORTE DE FACTURAS (LISTADO DE ARTICULOS)
  static reportePorFactura = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte por factura no implementado", 501));
  };

  //TODO REPORTE DE INVENTARIO (LISTADO DE ARTICULOS INVENTARIADOS Y POR INVENTARIAR)
  static reporteDeInventario = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte de inventario no implementado", 501));
  };
}

// GENERAR REPORTE

//¿COMO COPIAR UNA TABLA A EXCEL DIRECTAMENTE, DE LA WEB A EXCEL?
export default ReporteController;
