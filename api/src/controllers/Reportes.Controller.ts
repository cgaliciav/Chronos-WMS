import { Request, Response, NextFunction } from "express";
import { stat } from "fs/promises";
import { AppDataSource } from "../data-source";
import { Proveedor } from "../entity/Proveedor";
import { Usuario } from "../entity/Usuario";
import EnviarMail from "../helpers/enviarMail";
import { AppError } from "../helpers/errorClases";
import { idSeguro } from "../helpers/ids";
import { MovimientoTipoId as T } from "../entity/common/MovimientoTipoId";
import type { ArchivoReporte, TipoReporte } from "../helpers/generadoresReporte";
import ReporteService from "../services/ReporteService";
import { logger } from "../helpers/logger";
import NotificacionService from "../services/NotificacionService";
import { alcanceDe } from "../services/alcance";

/** Quien pidió el reporte: recibe la notificación (plan 02 · fase 7) y el correo. */
interface Destinatario {
  usuarioId: number;
  correo: string;
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
 * Genera un reporte (es el trabajo que entra a la cola; la petición ya respondió) y avisa al solicitante: notificación con el enlace
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

/**
 * Pide un reporte (decisión 27): entra a la cola (uno a la vez) y se genera en el proceso de reportes. Devuelve el
 * mensaje para el usuario; si hay otros por delante se le avisa también en la campana de que está en cola.
 */
const pedirReporte = async (etiqueta: string, destinatario: Destinatario, tipo: TipoReporte, body: unknown) => {
  const porDelante = ReporteService.encolar(() => generarEnSegundoPlano(etiqueta, destinatario, () => ReporteService.generar(tipo, body)));
  if (porDelante === 0) return MENSAJE_EN_PROCESO;
  const espera = porDelante === 1 ? "hay 1 reporte antes que el tuyo" : `hay ${porDelante} reportes antes que el tuyo`;
  const mensaje = `Tu reporte está en cola: ${espera}, así que puede tardar un poco más en generarse. Te avisaremos al terminar y recibirás un correo con el reporte solicitado`;
  await NotificacionService.crear(destinatario.usuarioId, { tipo: "reporte", titulo: "Reporte en cola", mensaje: `Reporte ${etiqueta}: ${espera}. Puede tardar un poco más en generarse.` }).catch((e) =>
    logger.error("No se pudo notificar que el reporte está en cola", { error: e })
  );
  return mensaje;
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
  static reportePorGrupo = async (req: Request, res: Response, next: NextFunction) => {
    const { ...body } = req.body;
    const { jwtPayload } = res.locals;
    try {
      const destinatario = await destinatarioDe(jwtPayload);
      // `alcance` siempre lo fija el servidor (decisión 21); nunca se toma del cuerpo de la petición.
      const datos = { ...body, nombreAlmacenista: jwtPayload.u, alcance: alcanceDe(res.locals) };
      res.json({
        message: await pedirReporte(body.fotoGrande ? "por grupo (foto grande)" : "por grupo", destinatario, body.fotoGrande ? "porGrupoFotoGrande" : "porGrupo", datos),
      });
    } catch (error) {
      next(error);
    }
  };

  static reportePorProyecto = async (req: Request, res: Response, next: NextFunction) => {
    const { activos = false, ...cuerpo } = req.body;
    const body = { ...cuerpo, alcance: alcanceDe(res.locals) };
    const { jwtPayload } = res.locals;
    try {
      const destinatario = await destinatarioDe(jwtPayload);
      let message: string;
      if (activos) {
        message = await pedirReporte("de préstamos y rentas activos", destinatario, "prestamosRentasActivas", body);
      } else {
        const compras = Array.isArray(body.movimientoTipoId) && body.movimientoTipoId.map(Number).includes(T.COMPRA);
        message = await pedirReporte(compras ? "por proyecto (compras)" : "por proyecto", destinatario, compras ? "porProyectoCompras" : "porProyecto", body);
      }
      res.json({ message });
    } catch (error) {
      next(error);
    }
  };

  /**
   * `POST /reports/by-supplier` `{ proveedorId, proyectoId?, conFoto?, sortField?, sortOrder?, filters? }`: Excel de
   * los artículos comprados a un proveedor (decisión 26). 404 si el proveedor no existe.
   */
  static reportePorProveedor = async (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    try {
      const proveedor = await AppDataSource.getRepository(Proveedor).findOne({
        where: { id: idSeguro(req.body.proveedorId, "proveedorId") },
        select: { id: true },
        loadEagerRelations: false,
      });
      if (!proveedor) throw new AppError("Proveedor no encontrado", 404);
      const destinatario = await destinatarioDe(jwtPayload);
      const body = { ...req.body, alcance: alcanceDe(res.locals) };
      res.json({ message: await pedirReporte("por proveedor", destinatario, "porProveedor", body) });
    } catch (error) {
      next(error);
    }
  };

  static reporteCierre = async (req: Request, res: Response, next: NextFunction) => {
    const { jwtPayload } = res.locals;
    const alcance = alcanceDe(res.locals);
    try {
      const destinatario = await destinatarioDe(jwtPayload);
      res.json({ message: await pedirReporte("de cierre", destinatario, "cierre", { ...req.body, alcance }) });
    } catch (error) {
      next(error);
    }
  };

  // Pendiente (responde 501): Generar reporte de uso (cuanto tiene que se realizó el ultimo movimiento que no fue inventario. el articulo no debe estar dado de baja)
  static reportePorUso = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte por uso no implementado", 501)); // antes la petición se quedaba colgada (hallazgo H9)
  };

  // Pendiente (responde 501): Reporte de grupodetalle (listado de articulos)
  static reportePorGrupoDetalle = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte por detalle de grupo no implementado", 501));
  };

  // Pendiente (responde 501): Reporte de facturas (listado de articulos)
  static reportePorFactura = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte por factura no implementado", 501));
  };

  // Pendiente (responde 501): Reporte de inventario (listado de articulos inventariados y por inventariar)
  static reporteDeInventario = async (req: Request, res: Response, next: NextFunction) => {
    next(new AppError("Reporte de inventario no implementado", 501));
  };
}

// GENERAR REPORTE

//¿COMO COPIAR UNA TABLA A EXCEL DIRECTAMENTE, DE LA WEB A EXCEL?
export default ReporteController;
