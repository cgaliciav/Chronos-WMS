/**
 * Guardas que protegen las reglas de `movimiento_relacion` frente a ediciones posteriores (plan 02 fase 3).
 * Regla 1: un derivado y su origen comparten proyecto. Cambiar el proyecto de una operación ya relacionada
 * rompería esa regla y los saldos por proyecto, así que se rechaza con 409 antes de modificar nada.
 */
import { getConnection } from "typeorm";
import { AppError } from "../helpers/errorClases";
import { idOpcional } from "../helpers/ids";

const consulta = (por: "grupo" | "operacion") => `
  SELECT DISTINCT m.id
    FROM movimiento m
    INNER JOIN operacion o ON o.id = m.operacionId
    ${por === "grupo" ? "INNER JOIN grupo_movimientos_movimiento gm ON gm.movimientoId = m.id AND gm.grupoId = ?" : ""}
   WHERE ${por === "operacion" ? "o.id = ? AND" : ""} NOT (o.proyectoId <=> ?)
     AND EXISTS (SELECT 1 FROM movimiento_relacion r WHERE r.origenId = m.id OR r.derivadoId = m.id)
   ORDER BY m.id`;

/** 409 si alguna operación (del grupo o la indicada) cambiaría de proyecto teniendo relaciones con otros movimientos. */
export const exigirProyectoEditable = async (filtro: { grupoId?: number | string; operacionId?: number | string }, proyectoId: number | string | null | undefined) => {
  const proyecto = idOpcional(proyectoId, "proyectoId") ?? null;
  const por = filtro.grupoId !== undefined ? "grupo" : "operacion";
  const id = idOpcional(por === "grupo" ? filtro.grupoId : filtro.operacionId, por === "grupo" ? "grupoId" : "operacionId");
  if (id === undefined) return;
  const filas = await getConnection().query(consulta(por), [id, proyecto]);
  if (filas.length > 0) {
    throw new AppError(
      "No se puede cambiar el proyecto: hay movimientos relacionados con otros (préstamos con devoluciones, etc.). Deshaga primero esas operaciones.",
      409,
      { movimientos: filas.map((f: any) => Number(f.id)) }
    );
  }
};
