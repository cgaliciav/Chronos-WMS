/**
 * Reglas puras de las notificaciones (plan 02 · fase 7): textos, destinatarios y formato de Server-Sent Events.
 * Sin base de datos, para probarlas con pruebas unitarias.
 */
import { MovimientoTipoId as T } from "../../entity/common/MovimientoTipoId";

/** Salidas que generan aviso de vencimiento: préstamo y renta externa (las compras y transferencias no "vencen"). */
export const TIPOS_CON_VENCIMIENTO: number[] = [T.PRESTAMO, T.RENTA_EXTERNA];

/** Una salida abierta y vencida tal como la devuelve la consulta de `NotificacionService.avisarPrestamosVencidos`. */
export interface SalidaVencida {
  movimientoId: number;
  movimientoTipoId: number;
  saldo: number | string;
  fecha: Date | string;
  proyecto: string | null;
  producto: string | null;
  grupoId: number | null;
  /** Ids de los usuarios activos de la operación, separados por comas (GROUP_CONCAT) o `null`. */
  usuarios: string | null;
  /** Usuario de la sesión que registró el movimiento. */
  registradoPor: number | null;
}

/** Fecha antes de la cual una salida abierta se considera vencida. */
export const fechaLimite = (dias: number, ahora = new Date()) => new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000);

/** Días de `DIAS_CUARENTENA` (120 si falta o no es un número positivo). */
export const diasCuarentena = (valor = process.env.DIAS_CUARENTENA) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 120;
};

/** Los usuarios de la operación; si no tiene, quien la registró. Sin repetidos. */
export const destinatarios = (salida: Pick<SalidaVencida, "usuarios" | "registradoPor">): number[] => {
  const deOperacion = (salida.usuarios ?? "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x > 0);
  if (deOperacion.length > 0) return [...new Set(deOperacion)];
  return salida.registradoPor ? [Number(salida.registradoPor)] : [];
};

const fechaCorta = (fecha: Date | string) => {
  const d = new Date(fecha);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Clave que impide repetir el aviso del mismo movimiento al mismo usuario. */
export const claveVencimiento = (movimientoId: number) => `prestamo-vencido:${movimientoId}`;

/** Título, mensaje y ruta del front del aviso de una salida vencida. */
export const avisoVencimiento = (salida: SalidaVencida) => {
  const renta = Number(salida.movimientoTipoId) === T.RENTA_EXTERNA;
  const base = renta ? "/renta-externa" : "/prestamos";
  const saldo = Number(salida.saldo);
  return {
    titulo: renta ? "Renta externa vencida" : "Préstamo vencido",
    mensaje:
      `${salida.producto ?? "Artículo"}: ${saldo} ${saldo === 1 ? "pieza pendiente" : "piezas pendientes"} ` +
      `en ${salida.proyecto ?? "sin proyecto"} desde el ${fechaCorta(salida.fecha)}.`,
    url: salida.grupoId ? `${base}/operacion?uid=${salida.grupoId}` : renta ? `${base}/por-proyecto` : `${base}/activos`,
  };
};

/** Un evento de Server-Sent Events (`event:` + `data:` JSON + línea en blanco). */
export const eventoSse = (evento: string, datos: unknown) => `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
