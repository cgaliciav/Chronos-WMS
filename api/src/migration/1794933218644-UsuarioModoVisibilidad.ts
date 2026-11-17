import { MigrationInterface, QueryRunner } from "typeorm";

export class UsuarioModoVisibilidad1794933218644 implements MigrationInterface {
    name = "UsuarioModoVisibilidad1794933218644";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuario\` ADD \`modoVisibilidad\` enum ('general', 'produccion', 'usuario') NOT NULL DEFAULT 'general'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuario\` DROP COLUMN \`modoVisibilidad\``);
    }
}
