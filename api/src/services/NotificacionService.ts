/**
 * Notificaciones propias (plan 02 · fase 7; sustituyen a MagicBell). Crea, lista y marca notificaciones, y avisa en
 * el momento a las conexiones abiertas de `GET /notifications/stream` mediante `eventosNotificacion`.
 *
 * El emisor es del proceso: con varias instancias del API, cada una solo avisa a sus propias conexiones (las demás
 * verán la notificación al volver a pedir la lista). Hoy el API corre en un solo contenedor.
 */
import { EventEmitter } from "events";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Notificacion, TipoNotificacion } from "../entity/Notificacion";
import { AppError } from "../helpers/errorClases";
import { logger } from "../helpers/logger";
import {
  avisoVencimiento,
  claveVencimiento,
  destinatarios,
  diasCuarentena,
  fechaLimite,
  SalidaVencida,
  TIPOS_CON_VENCIMIENTO,
} from "./reglas/notificaciones";

/** Eventos del proceso: `nueva` (una `NotificacionPublica`) y `conteo` (`{ usuarioId }`, cambió el número de no leídas). */
export const eventosNotificacion = new EventEmitter();
eventosNotificacion.setMaxListeners(0); // una escucha por pestaña abierta: sin aviso de "posible fuga"
export const EVENTO_NUEVA = "nueva";
export const EVENTO_CONTEO = "conteo";

export interface DatosNotificacion {
  titulo: string;
  mensaje?: string | null;
  tipo?: TipoNotificacion;
  url?: string | null;
  /** Si ya existe una notificación del usuario con esta clave, no se crea otra. */
  clave?: string | null;
}

/** Lo que ve el front (sin `clave` ni la relación). */
export type NotificacionPublica = Omit<Notificacion, "usuario" | "clave">;

/** Días que se conservan las notificaciones leídas. */
export const DIAS_RETENCION = 90;
/** Máximo de notificaciones por página de `listar`. */
export const POR_PAGINA = 50;

const publica = ({ usuario: _u, clave: _c, ...resto }: Notificacion): NotificacionPublica => resto;

const esDuplicado = (error: unknown) => {
  const e = error as { code?: string; driverError?: { code?: string } };
  return e.code === "ER_DUP_ENTRY" || e.driverError?.code === "ER_DUP_ENTRY";
};

const recortar = (texto: string | null | undefined, max: number) => (texto == null ? null : String(texto).slice(0, max));

export default class NotificacionService {
  /**
   * Crea una notificación y la emite. Devuelve `null` si ya existía otra del usuario con la misma `clave`.
   * Con `manager` se guarda dentro de esa transacción (el aviso sale igualmente al guardar).
   */
  static crear = async (
    usuarioId: number,
    datos: DatosNotificacion,
    manager: EntityManager = AppDataSource.manager
  ): Promise<NotificacionPublica | null> => {
    const notificacion = manager.create(Notificacion, {
      usuarioId,
      titulo: recortar(datos.titulo, 150) ?? "",
      mensaje: recortar(datos.mensaje, 500),
      tipo: datos.tipo ?? "sistema",
      url: recortar(datos.url, 255),
      clave: recortar(datos.clave, 100),
      leida: false,
      fechaLectura: null,
    });
    try {
      const guardada = publica(await manager.save(Notificacion, notificacion));
      eventosNotificacion.emit(EVENTO_NUEVA, guardada);
      return guardada;
    } catch (error) {
      if (datos.clave && esDuplicado(error)) return null;
      throw error;
    }
  };

  /** Las notificaciones del usuario, de la más reciente a la más antigua, de `POR_PAGINA` en `POR_PAGINA`. */
  static listar = (usuarioId: number, opciones: { soloNoLeidas?: boolean; pagina?: number } = {}) => {
    const pagina = Math.max(1, Math.floor(Number(opciones.pagina) || 1));
    return AppDataSource.getRepository(Notificacion).find({
      where: opciones.soloNoLeidas ? { usuarioId, leida: false } : { usuarioId },
      order: { id: "DESC" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    });
  };

  static contarNoLeidas = (usuarioId: number) =>
    AppDataSource.getRepository(Notificacion).countBy({ usuarioId, leida: false });

  /** Marca como leída una notificación del usuario. 404 si no existe o es de otro usuario. */
  static marcarLeida = async (usuarioId: number, id: number): Promise<NotificacionPublica> => {
    const repo = AppDataSource.getRepository(Notificacion);
    const notificacion = await repo.findOneBy({ id, usuarioId });
    if (!notificacion) throw new AppError("Notificación no encontrada", 404);
    if (!notificacion.leida) {
      notificacion.leida = true;
      notificacion.fechaLectura = new Date();
      await repo.update({ id, usuarioId }, { leida: true, fechaLectura: notificacion.fechaLectura });
      eventosNotificacion.emit(EVENTO_CONTEO, { usuarioId });
    }
    return notificacion;
  };

  /** Marca todas las no leídas del usuario. Devuelve cuántas cambió. */
  static marcarTodasLeidas = async (usuarioId: number): Promise<number> => {
    const resultado = await AppDataSource.getRepository(Notificacion).update(
      { usuarioId, leida: false },
      { leida: true, fechaLectura: new Date() }
    );
    const cambiadas = resultado.affected ?? 0;
    if (cambiadas > 0) eventosNotificacion.emit(EVENTO_CONTEO, { usuarioId });
    return cambiadas;
  };

  /** Retención: borra las notificaciones leídas creadas hace más de `dias`. Devuelve cuántas borró. */
  static borrarLeidasAntiguas = async (dias = DIAS_RETENCION, ahora = new Date()): Promise<number> => {
    const resultado = await AppDataSource.createQueryBuilder()
      .delete()
      .from(Notificacion)
      .where("leida = :leida AND fecha < :limite", { leida: true, limite: fechaLimite(dias, ahora) })
      .execute();
    return resultado.affected ?? 0;
  };

  /**
   * Avisa de los préstamos y rentas externas con saldo abierto registrados hace más de `dias` (`DIAS_CUARENTENA`).
   * Una sola vez por movimiento y usuario (`clave`); los movimientos legados no se avisan (no tienen relaciones, así
   * que su saldo nunca baja y todo el histórico parecería vencido). Devuelve cuántas notificaciones creó.
   */
  static avisarPrestamosVencidos = async (dias = diasCuarentena(), ahora = new Date()): Promise<number> => {
    const salidas: SalidaVencida[] = await AppDataSource.query(
      `SELECT v.movimientoId, v.movimientoTipoId, v.saldo, v.fecha, p.nombre AS proyecto, pr.titulo AS producto,
              (SELECT MIN(gm.grupoId) FROM grupo_movimientos_movimiento gm WHERE gm.movimientoId = v.movimientoId) AS grupoId,
              (SELECT GROUP_CONCAT(ou.usuarioId) FROM operacion_usuarios_usuario ou
                 INNER JOIN usuario u ON u.id = ou.usuarioId AND u.estatus = 'activo'
                WHERE ou.operacionId = m.operacionId) AS usuarios,
              s.usuarioId AS registradoPor
         FROM v_movimiento_saldo v
        INNER JOIN movimiento m ON m.id = v.movimientoId
        INNER JOIN inventario_actual ia ON ia.id = v.inventarioActualId
        INNER JOIN producto pr ON pr.id = ia.productoId
         LEFT JOIN proyecto p ON p.id = v.proyectoId
         LEFT JOIN sesion s ON s.id = m.sesionId
        WHERE v.legado = 0 AND v.saldo > 0 AND v.movimientoTipoId IN (?) AND v.fecha < ?
        ORDER BY v.movimientoId`,
      [TIPOS_CON_VENCIMIENTO, fechaLimite(dias, ahora)]
    );
    if (salidas.length === 0) return 0;

    // Claves ya avisadas, para no intentar insertar (y chocar con el índice único) cada vez.
    const claves = salidas.map((s) => claveVencimiento(Number(s.movimientoId)));
    const existentes = new Set(
      (
        await AppDataSource.query("SELECT usuarioId, clave FROM notificacion WHERE clave IN (?)", [claves])
      ).map((f: { usuarioId: number; clave: string }) => `${f.usuarioId}|${f.clave}`)
    );

    let creadas = 0;
    for (const salida of salidas) {
      const clave = claveVencimiento(Number(salida.movimientoId));
      const aviso = avisoVencimiento(salida);
      for (const usuarioId of destinatarios(salida)) {
        if (existentes.has(`${usuarioId}|${clave}`)) continue;
        if (await NotificacionService.crear(usuarioId, { ...aviso, tipo: "prestamo", clave })) creadas++;
      }
    }
    return creadas;
  };

  /** Tareas periódicas: avisos de vencimiento y retención. Nunca lanza (corre en un temporizador). */
  static ejecutarTareas = async () => {
    try {
      const avisos = await NotificacionService.avisarPrestamosVencidos();
      const borradas = await NotificacionService.borrarLeidasAntiguas();
      if (avisos + borradas > 0) logger.info(`Notificaciones: ${avisos} avisos de vencimiento, ${borradas} leídas antiguas borradas`);
    } catch (error) {
      logger.error("Error en las tareas de notificaciones:", (error as Error).message);
    }
  };

  /** Cada 6 h y al arrancar (como la limpieza de caché). Solo desde `src/index.ts`, no en las pruebas. */
  static iniciarTareas = () => {
    void NotificacionService.ejecutarTareas();
    const temporizador = setInterval(() => void NotificacionService.ejecutarTareas(), 6 * 60 * 60 * 1000);
    temporizador.unref();
    return temporizador;
  };
}
