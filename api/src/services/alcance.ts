/**
 * Alcance de datos de un usuario (plan 04 bloque B, decisión 21): qué productos (inventarios) ve y opera según su
 * `modoVisibilidad`. Es el ÚNICO lugar con la regla; controladores, servicios y reportes la aplican con estas funciones.
 *
 * `checkRole` deja el alcance en `res.locals.alcance`. El rol ADMINISTRADOR siempre tiene alcance general.
 *
 * El SQL generado solo interpola enteros propios del servidor (id del usuario y de sus proyectos, validados aquí), nunca
 * datos de la petición, así que sirve igual para QueryBuilder y para SQL crudo.
 */
import { EntityManager, ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { AppDataSource } from "../data-source";
import { ModoVisibilidad } from "../entity/common/ModoVisibilidad";
import { TIPOS_ENTRADA_DE_PRODUCCION } from "../entity/common/MovimientoTipoId";
import { AppError } from "../helpers/errorClases";
import { idSeguro } from "../helpers/ids";

export interface Alcance {
  modo: ModoVisibilidad;
  usuarioId: number;
  /** Proyectos (producciones) asignados al usuario. */
  proyectos: number[];
}

export const ALCANCE_GENERAL: Alcance = { modo: ModoVisibilidad.GENERAL, usuarioId: 0, proyectos: [] };

/** Alcance de la petición; general si la ruta no pasó por `checkRole`. */
export const alcanceDe = (locals: { alcance?: Alcance }): Alcance => locals.alcance ?? ALCANCE_GENERAL;

export const esRestringido = (alcance: Alcance | undefined | null) =>
  alcance !== undefined && alcance !== null && alcance.modo !== ModoVisibilidad.GENERAL;

const entero = (valor: unknown, nombre: string) => {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`Alcance inválido: ${nombre}`, 500);
  return n;
};

/**
 * Condición SQL que limita a los inventarios visibles, o `null` si el alcance es general.
 * `columnaInventarioId` es la expresión del id de `inventario_actual` en la consulta (p. ej. `inventarioActual.id`).
 */
export const sqlAlcance = (alcance: Alcance | undefined | null, columnaInventarioId: string): string | null => {
  if (!alcance || alcance.modo === ModoVisibilidad.GENERAL) return null;

  if (alcance.modo === ModoVisibilidad.PRODUCCION) {
    if (alcance.proyectos.length === 0) return "1 = 0"; // sin producciones asignadas no ve nada
    const proyectos = alcance.proyectos.map((p) => entero(p, "proyecto")).join(", ");
    // Visible si una COMPRA (o creación por transformación) fue de sus proyectos, o si lo es el último movimiento con operación.
    return `EXISTS (SELECT 1 FROM movimiento alc_m INNER JOIN operacion alc_o ON alc_o.id = alc_m.operacionId
      WHERE alc_m.inventarioActualId = ${columnaInventarioId} AND alc_o.proyectoId IN (${proyectos})
        AND (alc_o.movimientoTipoId IN (${TIPOS_ENTRADA_DE_PRODUCCION.join(", ")})
             OR alc_m.id = (SELECT MAX(alc_u.id) FROM movimiento alc_u
                             WHERE alc_u.inventarioActualId = ${columnaInventarioId} AND alc_u.operacionId IS NOT NULL)))`;
  }

  const usuario = entero(alcance.usuarioId, "usuario");
  // Visible si en algún movimiento es quien lo registró (sesión) o uno de los responsables de la operación.
  return `EXISTS (SELECT 1 FROM movimiento alc_m INNER JOIN sesion alc_s ON alc_s.id = alc_m.sesionId
      WHERE alc_m.inventarioActualId = ${columnaInventarioId}
        AND (alc_s.usuarioId = ${usuario}
             OR EXISTS (SELECT 1 FROM operacion_usuarios_usuario alc_ou
                         WHERE alc_ou.operacionId = alc_m.operacionId AND alc_ou.usuarioId = ${usuario})))`;
};

/** Añade a un QueryBuilder la condición de alcance sobre el alias (o columna) del inventario. */
export const aplicarAlcance = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alcance: Alcance | undefined | null,
  columnaInventarioId = "inventarioActual.id"
): SelectQueryBuilder<T> => {
  const sql = sqlAlcance(alcance, columnaInventarioId);
  return sql === null ? qb : qb.andWhere(`(${sql})`);
};

/** ¿El usuario ve este inventario? */
export const inventarioVisible = async (
  alcance: Alcance | undefined | null,
  inventarioActualId: number | string,
  manager: EntityManager = AppDataSource.manager
): Promise<boolean> => {
  const sql = sqlAlcance(alcance, "ia.id");
  if (sql === null) return true;
  const filas = await manager.query(`SELECT 1 AS visible FROM inventario_actual ia WHERE ia.id = ? AND (${sql}) LIMIT 1`, [
    idSeguro(inventarioActualId, "inventarioActualId"),
  ]);
  return filas.length > 0;
};

const noExiste = (mensaje: string) => new AppError(mensaje, 404);

/** 404 si el inventario queda fuera del alcance (misma respuesta que si no existiera). */
export const exigirInventarioVisible = async (
  alcance: Alcance | undefined | null,
  inventarioActualId: number | string,
  manager: EntityManager = AppDataSource.manager
) => {
  if (!(await inventarioVisible(alcance, inventarioActualId, manager))) throw noExiste("No existe el artículo");
};

/** 404 si el movimiento no existe o su inventario queda fuera del alcance. */
export const exigirMovimientoVisible = async (
  alcance: Alcance | undefined | null,
  movimientoId: number | string,
  manager: EntityManager = AppDataSource.manager
) => {
  if (!esRestringido(alcance)) return;
  const [fila] = await manager.query("SELECT inventarioActualId FROM movimiento WHERE id = ?", [idSeguro(movimientoId, "movimientoId")]);
  if (!fila || !(await inventarioVisible(alcance, fila.inventarioActualId, manager))) throw noExiste("No existe el movimiento");
};

/** 404 si el producto no existe o queda fuera del alcance. */
export const exigirProductoVisible = async (
  alcance: Alcance | undefined | null,
  productoId: number | string,
  manager: EntityManager = AppDataSource.manager
) => {
  if (!esRestringido(alcance)) return;
  const [fila] = await manager.query("SELECT id FROM inventario_actual WHERE productoId = ?", [idSeguro(productoId, "productoId")]);
  if (!fila || !(await inventarioVisible(alcance, fila.id, manager))) throw noExiste("No existe el artículo");
};

/**
 * En modo producción solo se opera a nombre de las producciones asignadas: así el usuario no registra ni compra
 * artículos que después dejaría de ver.
 */
export const exigirProyectoPermitido = (alcance: Alcance | undefined | null, proyectoId: number | string | null | undefined) => {
  if (!alcance || alcance.modo !== ModoVisibilidad.PRODUCCION) return;
  if (proyectoId === null || proyectoId === undefined || !alcance.proyectos.includes(Number(proyectoId))) {
    throw new AppError("SOLO PUEDE OPERAR CON LAS PRODUCCIONES QUE TIENE ASIGNADAS", 403);
  }
};
