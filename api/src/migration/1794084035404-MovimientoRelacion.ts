import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Vista de saldos pendientes (plan 02 §2.1 regla 2). Una fila por movimiento con operación de un tipo con saldo
 * (orígenes 3, 11, 12, 15 y la transferencia origen 7). `saldo = cantidad − Σ relaciones donde es origen`.
 * Los movimientos `legado` aparecen con su columna para que cada consulta decida (no tienen relaciones).
 */
export const SQL_VISTA_SALDO = `CREATE OR REPLACE SQL SECURITY INVOKER VIEW \`v_movimiento_saldo\` AS
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
  WHERE o.\`movimientoTipoId\` IN (3, 7, 11, 12, 15)
) x`; // tipos = TIPOS_CON_SALDO, congelados en la migración. Subconsulta correlacionada: usa el índice de origenId.

/**
 * Plan 02 · fase 3 · paso 2: relación N:M entre movimientos, fecha propia del movimiento, marca `legado`,
 * instantánea del histórico ligada a su movimiento y vista `v_movimiento_saldo`.
 * Sin backfill de relaciones (decisión 6): solo se completan `movimiento.fecha` y `movimiento.legado`.
 */

export class MovimientoRelacion1794084035404 implements MigrationInterface {
    name = "MovimientoRelacion1794084035404";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`movimiento_relacion\` (\`id\` int NOT NULL AUTO_INCREMENT, \`cantidad\` decimal(15,4) NOT NULL, \`tipo\` enum ('devolucion', 'baja', 'transferencia', 'cierre-inventario') NOT NULL, \`fecha\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`origenId\` int NOT NULL, \`derivadoId\` int NOT NULL, INDEX \`IDX_1011f39b7c3fd4834a7b01de3e\` (\`origenId\`), INDEX \`IDX_eef7d8ad88d9bb491f9f54f386\` (\`derivadoId\`), UNIQUE INDEX \`IDX_00b01c25873dce78ae45fa50db\` (\`origenId\`, \`derivadoId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`movimiento\` ADD \`fecha\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`movimiento\` ADD \`legado\` tinyint NOT NULL DEFAULT 0`);
        // Datos históricos: todo movimiento existente es legado (no tiene relaciones) y toma la fecha de su
        // operación o, si no tiene, la del primer grupo que lo contiene. Los que no tienen ninguna conservan la de hoy.
        await queryRunner.query(`UPDATE \`movimiento\` SET \`legado\` = 1`);
        await queryRunner.query(`UPDATE \`movimiento\` m INNER JOIN \`operacion\` o ON o.\`id\` = m.\`operacionId\` SET m.\`fecha\` = o.\`fecha\``);
        await queryRunner.query(`UPDATE \`movimiento\` m
            INNER JOIN (SELECT gm.\`movimientoId\`, MIN(g.\`fecha\`) AS \`fecha\`
                        FROM \`grupo_movimientos_movimiento\` gm INNER JOIN \`grupo\` g ON g.\`id\` = gm.\`grupoId\`
                        GROUP BY gm.\`movimientoId\`) pg ON pg.\`movimientoId\` = m.\`id\`
            SET m.\`fecha\` = pg.\`fecha\`
            WHERE m.\`operacionId\` IS NULL`);
        await queryRunner.query(`ALTER TABLE \`inventario_actual_historico\` ADD \`movimientoId\` int NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_331dd31d0447e07d553833f7eb\` ON \`inventario_actual_historico\` (\`movimientoId\`)`);
        await queryRunner.query(`ALTER TABLE \`movimiento_relacion\` ADD CONSTRAINT \`FK_1011f39b7c3fd4834a7b01de3e1\` FOREIGN KEY (\`origenId\`) REFERENCES \`movimiento\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movimiento_relacion\` ADD CONSTRAINT \`FK_eef7d8ad88d9bb491f9f54f3865\` FOREIGN KEY (\`derivadoId\`) REFERENCES \`movimiento\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`inventario_actual_historico\` ADD CONSTRAINT \`FK_331dd31d0447e07d553833f7eb2\` FOREIGN KEY (\`movimientoId\`) REFERENCES \`movimiento\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(SQL_VISTA_SALDO);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW IF EXISTS \`v_movimiento_saldo\``);
        await queryRunner.query(`ALTER TABLE \`inventario_actual_historico\` DROP FOREIGN KEY \`FK_331dd31d0447e07d553833f7eb2\``);
        await queryRunner.query(`ALTER TABLE \`movimiento_relacion\` DROP FOREIGN KEY \`FK_eef7d8ad88d9bb491f9f54f3865\``);
        await queryRunner.query(`ALTER TABLE \`movimiento_relacion\` DROP FOREIGN KEY \`FK_1011f39b7c3fd4834a7b01de3e1\``);
        await queryRunner.query(`DROP INDEX \`IDX_331dd31d0447e07d553833f7eb\` ON \`inventario_actual_historico\``);
        await queryRunner.query(`ALTER TABLE \`inventario_actual_historico\` DROP COLUMN \`movimientoId\``);
        await queryRunner.query(`ALTER TABLE \`movimiento\` DROP COLUMN \`legado\``);
        await queryRunner.query(`ALTER TABLE \`movimiento\` DROP COLUMN \`fecha\``);
        await queryRunner.query(`DROP INDEX \`IDX_00b01c25873dce78ae45fa50db\` ON \`movimiento_relacion\``);
        await queryRunner.query(`DROP INDEX \`IDX_eef7d8ad88d9bb491f9f54f386\` ON \`movimiento_relacion\``);
        await queryRunner.query(`DROP INDEX \`IDX_1011f39b7c3fd4834a7b01de3e\` ON \`movimiento_relacion\``);
        await queryRunner.query(`DROP TABLE \`movimiento_relacion\``);
    }
}
