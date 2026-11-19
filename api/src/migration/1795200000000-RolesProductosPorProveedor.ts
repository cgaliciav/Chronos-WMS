import { MigrationInterface, QueryRunner } from "typeorm";

/** Roles de la pantalla Proveedores / Productos por proveedor (menú y `<ACL>`) y de su ruta del API. */
const ROLES = ["V-ADMINISTRACION-PROVEEDORESPRODUCTOS", "GRUPOS-LISTAPORPROVEEDOR"];

/**
 * Crea los roles donde no existan (por `codigoRol`). Solo importan para los usuarios `personalizado`: los perfiles
 * toman sus permisos de `services/perfiles.ts`. No asigna roles a nadie.
 */
export class RolesProductosPorProveedor1795200000000 implements MigrationInterface {
    name = "RolesProductosPorProveedor1795200000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const codigoRol of ROLES) {
            await queryRunner.query(
                "INSERT INTO `rol` (`nombre`, `codigoRol`) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `rol` WHERE `codigoRol` = ?)",
                [codigoRol, codigoRol, codigoRol]
            );
        }
    }

    public async down(): Promise<void> {
        // No se borran: pueden estar asignados a usuarios.
    }
}
