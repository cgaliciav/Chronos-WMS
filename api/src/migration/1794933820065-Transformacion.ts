import { MigrationInterface, QueryRunner } from "typeorm";
import { SQL_VISTA_SALDO_SIN_CONSUMIBLES } from "./1794932436077-ConsumiblesYBajasPorCantidad";

/** Vista de saldos con el ALTA POR TRANSFORMACIÓN (19) como origen: el producto nuevo queda a cargo de la producción. */
const SQL_VISTA_SALDO_CON_TRANSFORMACION = SQL_VISTA_SALDO_SIN_CONSUMIBLES.replace("IN (3, 7, 11, 12, 15)", "IN (3, 7, 11, 12, 15, 19)");

/** Ids fijos (MovimientoTipoId). Si ya los ocupa otro tipo, la migración se detiene. */
const TIPOS: [number, string][] = [
  [18, "TRANSFORMACIÓN"],
  [19, "ALTA POR TRANSFORMACIÓN"],
];

/**
 * Plan 04 · bloque C (decisión 20): tipos de movimiento 18 y 19, relación `transformacion` entre el artículo original y
 * los productos creados, vista de saldos con el 19 y rol `GRUPOS-TRANSFORMAR`.
 */

export class Transformacion1794933820065 implements MigrationInterface {
    name = "Transformacion1794933820065";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`movimiento_relacion\` CHANGE \`tipo\` \`tipo\` enum ('devolucion', 'baja', 'transferencia', 'cierre-inventario', 'transformacion') NOT NULL`);
        for (const [id, nombre] of TIPOS) {
            await queryRunner.query("INSERT IGNORE INTO `movimiento_tipo` (`id`, `nombre`) VALUES (?, ?)", [id, nombre]);
            const [tipo] = await queryRunner.query("SELECT `nombre` FROM `movimiento_tipo` WHERE `id` = ?", [id]);
            if (!tipo || tipo.nombre !== nombre) {
                throw new Error(`movimiento_tipo id ${id} debe ser "${nombre}" y es "${tipo?.nombre ?? "(no existe)"}": revisa el catálogo antes de migrar`);
            }
        }
        if (!SQL_VISTA_SALDO_CON_TRANSFORMACION.includes("15, 19")) throw new Error("No se pudo componer la vista de saldos");
        await queryRunner.query(SQL_VISTA_SALDO_CON_TRANSFORMACION);
        await queryRunner.query("INSERT IGNORE INTO `rol` (`nombre`, `codigoRol`) VALUES ('Transformar productos', 'GRUPOS-TRANSFORMAR')");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Los tipos 18 y 19 no se borran: puede haber operaciones que los usen.
        await queryRunner.query("DELETE FROM `rol` WHERE `codigoRol` = 'GRUPOS-TRANSFORMAR'");
        await queryRunner.query(SQL_VISTA_SALDO_SIN_CONSUMIBLES);
        await queryRunner.query(`ALTER TABLE \`movimiento_relacion\` CHANGE \`tipo\` \`tipo\` enum ('devolucion', 'baja', 'transferencia', 'cierre-inventario') NOT NULL`);
    }
}
