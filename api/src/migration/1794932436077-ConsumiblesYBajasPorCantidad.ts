import { MigrationInterface, QueryRunner } from "typeorm";
import { SQL_VISTA_SALDO } from "./1794084035404-MovimientoRelacion";

/**
 * Vista de saldos sin los movimientos de productos CONSUMIBLES (expendables, decisión 18): lo que sale de un
 * consumible se da por consumido y no deja pendiente de devolución. Congelada aquí: no importes constantes del código.
 */
export const SQL_VISTA_SALDO_SIN_CONSUMIBLES = `CREATE OR REPLACE SQL SECURITY INVOKER VIEW \`v_movimiento_saldo\` AS
SELECT x.*, x.\`cantidad\` - x.\`aplicado\` AS \`saldo\`
FROM (
  SELECT m.\`id\` AS \`movimientoId\`,
         m.\`inventarioActualId\`,
         o.\`proyectoId\`,
         o.\`movimientoTipoId\`,
         m.\`cantidad\`,
         m.\`fecha\`,
         m.\`legado\`,
         (SELECT COALESCE(SUM(r.\`cantidad\`), 0) FROM \`movimiento_relacion\` r WHERE r.\`origenId\` = m.\`id\`) AS \`aplicado\`
  FROM \`movimiento\` m
  INNER JOIN \`operacion\` o ON o.\`id\` = m.\`operacionId\`
  WHERE o.\`movimientoTipoId\` IN (3, 7, 11, 12, 15) AND m.\`consumible\` = 0
) x`;

/**
 * Plan 04 · bloque A: marca `consumible` y deltas de existencias en `movimiento` (para deshacer bajas por cantidad y
 * movimientos de expendables), tipo de producto CONSUMIBLE (id 2) y vista de saldos sin consumibles.
 * Los movimientos existentes quedan con `consumible = 0` y deltas NULL: se siguen deshaciendo como antes.
 */

export class ConsumiblesYBajasPorCantidad1794932436077 implements MigrationInterface {
    name = "ConsumiblesYBajasPorCantidad1794932436077";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`movimiento\` ADD \`consumible\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`movimiento\` ADD \`efectoCantidad\` decimal(15,4) NULL`);
        await queryRunner.query(`ALTER TABLE \`movimiento\` ADD \`efectoAlmacen\` decimal(15,4) NULL`);
        // El id 2 es fijo (ProductoTipoId.CONSUMIBLE). Si ya lo ocupa otro tipo, la migración se detiene sin tocar datos.
        await queryRunner.query("INSERT IGNORE INTO `producto_tipo` (`id`, `nombre`) VALUES (2, 'CONSUMIBLE')");
        const [tipo] = await queryRunner.query("SELECT `nombre` FROM `producto_tipo` WHERE `id` = 2");
        if (!tipo || String(tipo.nombre).toUpperCase() !== "CONSUMIBLE") {
            throw new Error(`producto_tipo id 2 debe ser CONSUMIBLE y es "${tipo?.nombre ?? "(no existe)"}": revisa el catálogo antes de migrar`);
        }
        await queryRunner.query(SQL_VISTA_SALDO_SIN_CONSUMIBLES);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // El tipo CONSUMIBLE no se borra: puede haber productos que lo usen.
        await queryRunner.query(SQL_VISTA_SALDO);
        await queryRunner.query(`ALTER TABLE \`movimiento\` DROP COLUMN \`efectoAlmacen\``);
        await queryRunner.query(`ALTER TABLE \`movimiento\` DROP COLUMN \`efectoCantidad\``);
        await queryRunner.query(`ALTER TABLE \`movimiento\` DROP COLUMN \`consumible\``);
    }
}
