import { NextFunction, Request, Response } from "express";
import { idSeguro, parametro } from "../helpers/ids";
import { logger } from "../helpers/logger";
import NotificacionService, {
  EVENTO_CONTEO,
  EVENTO_NUEVA,
  eventosNotificacion,
  NotificacionPublica,
} from "../services/NotificacionService";
import { eventoSse } from "../services/reglas/notificaciones";

/** Intervalo del latido de `stream`: mantiene viva la conexión a través de proxies (nginx corta a los 60 s). */
export const LATIDO_MS = 25_000;

/** Notificaciones del usuario del token (plan 02 · fase 7). Nadie ve ni marca las de otro usuario. */
export default class NotificacionController {
  /** `GET /notifications?unread=1&page=N` → arreglo, de la más reciente a la más antigua (50 por página). */
  static listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const soloNoLeidas = ["1", "true"].includes(String(req.query.unread ?? ""));
      res.json(await NotificacionService.listar(res.locals.jwtPayload.ui, { soloNoLeidas, pagina: Number(req.query.page) }));
    } catch (error) {
      next(error);
    }
  };

  /** `GET /notifications/count` → `{ noLeidas }`. */
  static contar = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ noLeidas: await NotificacionService.contarNoLeidas(res.locals.jwtPayload.ui) });
    } catch (error) {
      next(error);
    }
  };

  /** `PUT /notifications/:id/read` → la notificación, con `leida` y `fechaLectura`. */
  static marcarLeida = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await NotificacionService.marcarLeida(res.locals.jwtPayload.ui, idSeguro(parametro(req, "id"))));
    } catch (error) {
      next(error);
    }
  };

  /** `PUT /notifications/read-all` → `{ actualizadas }`. */
  static marcarTodas = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ actualizadas: await NotificacionService.marcarTodasLeidas(res.locals.jwtPayload.ui) });
    } catch (error) {
      next(error);
    }
  };

  /**
   * `GET /notifications/stream` (Server-Sent Events). Al conectar envía `conteo` (`{ noLeidas }`); después,
   * `notificacion` con cada notificación nueva del usuario y `conteo` cuando cambia el número de no leídas.
   * `retry: 10000` pide al navegador reconectar a los 10 s si se corta.
   */
  static stream = async (req: Request, res: Response, next: NextFunction) => {
    const usuarioId: number = res.locals.jwtPayload.ui;
    let noLeidas: number;
    try {
      noLeidas = await NotificacionService.contarNoLeidas(usuarioId);
    } catch (error) {
      next(error);
      return;
    }
    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx: no acumular la respuesta
    });
    res.flushHeaders();
    res.write("retry: 10000\n\n");
    res.write(eventoSse("conteo", { noLeidas }));

    const alCrear = (notificacion: NotificacionPublica) => {
      if (notificacion.usuarioId === usuarioId) res.write(eventoSse("notificacion", notificacion));
    };
    const alCambiarConteo = async (evento: { usuarioId: number }) => {
      if (evento.usuarioId !== usuarioId) return;
      try {
        res.write(eventoSse("conteo", { noLeidas: await NotificacionService.contarNoLeidas(usuarioId) }));
      } catch (error) {
        logger.warn("No se pudo enviar el conteo de notificaciones:", (error as Error).message);
      }
    };
    eventosNotificacion.on(EVENTO_NUEVA, alCrear);
    eventosNotificacion.on(EVENTO_CONTEO, alCambiarConteo);
    const latido = setInterval(() => res.write(": latido\n\n"), LATIDO_MS);
    latido.unref();

    req.on("close", () => {
      clearInterval(latido);
      eventosNotificacion.off(EVENTO_NUEVA, alCrear);
      eventosNotificacion.off(EVENTO_CONTEO, alCambiarConteo);
    });
  };
}
