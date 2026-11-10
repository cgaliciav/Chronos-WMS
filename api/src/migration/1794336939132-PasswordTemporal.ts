import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Contraseña temporal con cambio obligatorio (hallazgo L2): dos columnas en `usuario`. Las cuentas existentes quedan
 * con `debeCambiarPassword = 0` (nada cambia para ellas hasta que el administrador les regenere la contraseña).
 */
export class PasswordTemporal1794336939132 implements MigrationInterface {
    name = "PasswordTemporal1794336939132";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuario\` ADD \`debeCambiarPassword\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`usuario\` ADD \`vencePasswordTemporal\` datetime(6) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuario\` DROP COLUMN \`vencePasswordTemporal\``);
        await queryRunner.query(`ALTER TABLE \`usuario\` DROP COLUMN \`debeCambiarPassword\``);
    }
}
