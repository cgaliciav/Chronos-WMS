import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Perfil del usuario (decisión 22): de él salen sus permisos (`services/perfiles.ts`). Quien hoy tiene el rol
 * ADMINISTRADOR (que entraba a todo, también a la Configuración) pasa a `superadministrador`, así nadie pierde acceso;
 * el resto queda como `personalizado` y conserva sus roles sueltos hasta que se le asigne un perfil.
 */
export class PerfilDeUsuario1795114937467 implements MigrationInterface {
    name = "PerfilDeUsuario1795114937467";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuario\` ADD \`perfil\` enum ('superadministrador', 'administrador', 'encargado-produccion', 'visita', 'sin-acceso', 'personalizado') NOT NULL DEFAULT 'personalizado'`);
        await queryRunner.query(
            "UPDATE `usuario` SET `perfil` = 'superadministrador' WHERE `id` IN (SELECT ur.`usuarioId` FROM `usuario_roles_rol` ur INNER JOIN `rol` r ON r.`id` = ur.`rolId` WHERE r.`codigoRol` = 'ADMINISTRADOR')"
        );
        // Rol del `<ACL>` de los listados de bajas por listado: el front lo pedía mal escrito (`OPERACION-BajasPORGRUPO`)
        // y no existía en ninguna base.
        await queryRunner.query(
            "INSERT INTO `rol` (`nombre`, `codigoRol`) SELECT 'OPERACION-BAJASPORGRUPO', 'OPERACION-BAJASPORGRUPO' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `rol` WHERE `codigoRol` = 'OPERACION-BAJASPORGRUPO')"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Los administradores por perfil recuperan el rol ADMINISTRADOR si ya no lo tenían; los demás perfiles no se
        // pueden traducir de vuelta a roles sueltos.
        await queryRunner.query(
            "INSERT IGNORE INTO `usuario_roles_rol` (`usuarioId`, `rolId`) SELECT u.`id`, r.`id` FROM `usuario` u INNER JOIN `rol` r ON r.`codigoRol` = 'ADMINISTRADOR' WHERE u.`perfil` IN ('superadministrador', 'administrador')"
        );
        await queryRunner.query(`ALTER TABLE \`usuario\` DROP COLUMN \`perfil\``);
    }
}
