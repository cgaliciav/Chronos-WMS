import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Plan 02 · fase 7: tabla `notificacion` (notificaciones propias, sustituyen a MagicBell). Solo crea la tabla: no toca
 * datos existentes. `down` la borra con sus notificaciones.
 */
export class Notificacion1794327605255 implements MigrationInterface {
    name = "Notificacion1794327605255";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`notificacion\` (\`id\` int NOT NULL AUTO_INCREMENT, \`usuarioId\` int NOT NULL, \`titulo\` varchar(150) NOT NULL, \`mensaje\` varchar(500) NULL, \`tipo\` enum ('reporte', 'prestamo', 'sistema') NOT NULL DEFAULT 'sistema', \`url\` varchar(255) NULL, \`leida\` tinyint NOT NULL DEFAULT 0, \`fecha\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`fechaLectura\` datetime(6) NULL, \`clave\` varchar(100) NULL, UNIQUE INDEX \`IDX_8eb4a0e34931446c69a5ef5130\` (\`usuarioId\`, \`clave\`), INDEX \`IDX_361d7e63131559c27bd6a5b99b\` (\`usuarioId\`, \`leida\`, \`id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`notificacion\` ADD CONSTRAINT \`FK_acdc42b01f62aded0f2983100df\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notificacion\` DROP FOREIGN KEY \`FK_acdc42b01f62aded0f2983100df\``);
        await queryRunner.query(`DROP TABLE \`notificacion\``);
    }
}
