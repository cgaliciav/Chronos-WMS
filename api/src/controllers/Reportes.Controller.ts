import { Request, Response, NextFunction } from "express";
import { stat } from "fs/promises";
import { AppDataSource } from "../data-source";
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
import { logger } from "../helpers/logger";
import NotificacionService from "../services/NotificacionService";

/** Quien pidió el reporte: recibe la notificación (plan 02 · fase 7) y el correo. */
interface Destinatario {
  usuarioId: number;
  correo: string;
}

interface ArchivoReporte {
  path: string;
  nombreReporte: string;
}

const MENSAJE_EN_PROCESO = "El reporte se está generando. Te avisaremos al terminar y recibirás un correo con el reporte solicitado";

/** Correo con el reporte: adjunto si pesa hasta 8 MiB; si no, un enlace de descarga. */
const enviarPorCorreo = (correo: string, archivo: ArchivoReporte, tamano: number) => {
  if (tamano > 8 * 1024 * 1024) {
    EnviarMail.correorReporteDescarga(correo, {
      filename: archivo.nombreReporte,
      path: `${process.env.API_ALMACEN}/file/report/${archivo.nombreReporte}`,
    });
  } else {
    EnviarMail.correoConAnexos(correo, [{ filename: "reporte.xlsx", path: archivo.path }]);
  }
};

/**
 * Genera un reporte en segundo plano (la petición ya respondió) y avisa al solicitante: notificación con el enlace
 * de descarga (`/file/report/<nombre>`) y correo, o una notificación de error si falla. Nunca rechaza: la promesa
 * corre sin `await` y un rechazo tiraría el proceso (hallazgo H8).
 */
const generarEnSegundoPlano = async (etiqueta: string, destinatario: Destinatario, generar: () => Promise<ArchivoReporte>) => {
  try {
    const archivo = await generar();
    const { size } = await stat(archivo.path);
    logger.info(`Reporte ${etiqueta} generado`, { archivo: archivo.nombreReporte, size });
    await NotificacionService.crear(destinatario.usuarioId, {
      tipo: "reporte",
      titulo: "Reporte generado",
      mensaje: archivo.nombreReporte,
      url: `/file/report/${encodeURIComponent(archivo.nombreReporte)}`,
    });
    enviarPorCorreo(destinatario.correo, archivo, size);
  } catch (error) {
    logger.error(`Error al generar el reporte ${etiqueta}`, { error });
    await NotificacionService.crear(destinatario.usuarioId, {
      tipo: "reporte",
      titulo: "Error al generar el reporte",
      mensaje: `${etiqueta}: ${(error as Error)?.message ?? error}`,
    }).catch((e) => logger.error("No se pudo notificar el error del reporte", { error: e }));
  }
};

const destinatarioDe = async (jwtPayload: { ui: number }): Promise<Destinatario> => {
  const usuario = await AppDataSource.getRepository(Usuario).findOneOrFail({
    where: { id: jwtPayload.ui },
    select: { id: true, correo: true },
    loadEagerRelations: false,
  });
  return { usuarioId: usuario.id, correo: usuario.correo };
};

class ReporteController {
  // TODO GENERAR REPORTE DE MOVIMINETOS (ALTAS, BAJAS, COMPRAS, ETC, (NO INVENTARIOS, ) POR FECHA)
  static reportePorGrupo = async (req: Request, res: Response, next: NextFunction) => {
    const { ...body } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const destinatario = await destinatarioDe(jwtPayload);
      const datos = { ...body, nombreAlmacenista: jwtPayload.u };
      void generarEnSegundoPlano(body.fotoGrande ? "por grupo (foto grande)" : "por grupo", destinatario, () =>
        body.fotoGrande ? reportePorGrupoFotoGrande(datos) : reportePorGrupo(datos)
      );
      res.json({ message: MENSAJE_EN_PROCESO });
    } catch (error) {
      next(error);
    }
  };

  static reportePorProyecto = async (req: Request, res: Response, next: NextFunction) => {
    const { activos = false, ...body } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const destinatario = await destinatarioDe(jwtPayload);
      if (activos) {
        void generarEnSegundoPlano("de préstamos y rentas activos", destinatario, () => reportePorPrestamosRentasActivas(body));
      } else {
        const compras = Array.isArray(body.movimientoTipoId) && body.movimientoTipoId.map(Number).includes(T.COMPRA);
        void generarEnSegundoPlano(compras ? "por proyecto (compras)" : "por proyecto", destinatario, () =>
          compras ? reportePorProyectoCompras(body) : reportePorProyecto(body)
        );
      }
      res.json({ message: MENSAJE_EN_PROCESO });
    } catch (error) {
      next(error);
    }
  };

  //TODO GENERAR REPORTE DE CIERRRE (COMPRAS, RENTAS, DEVOLUCIONES, BAJAS JUSTIFICADAS E INJUSTIFICADAS, HOJA RESUMEN,TODO EN UN ARCHIVO...)
  static reporteCierre = async (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    try {
      const destinatario = await destinatarioDe(jwtPayload);
      void generarEnSegundoPlano("de cierre", destinatario, () => reporteGeneral(req.body));
      res.json({ message: MENSAJE_EN_PROCESO });
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
