import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Plan 03 · fase 1: tabla `configuracion` (una fila por sección) con los valores por defecto de Chronos WMS, y el rol
 * `CONFIGURACION-EDITAR`. Idempotente en los datos (`INSERT IGNORE`). Los JSON están congelados aquí a propósito: una
 * migración publicada no debe cambiar si cambian los valores por defecto del código.
 */
const POR_DEFECTO_V1: [string, string][] = [
  ["marca", "{\"nombreApp\": \"Chronos WMS\", \"nombreCorto\": \"Chronos WMS\", \"organizacion\": \"\", \"textoBienvenida\": \"Bienvenido a Chronos WMS\", \"textoAyudaLogin\": \"Si no recuerda su acceso, por favor comuníquese con el administrador del sistema\", \"soporteCorreo\": \"soporte@exogrid.io\", \"creditoProveedor\": {\"texto\": \"EXOGRID TECHNOLOGY\", \"url\": \"https://exogrid.io/software\", \"visible\": true}, \"tema\": {\"colorPrimario\": \"#4b7cf3\", \"colorEnlaceHover\": \"#42baf9\", \"fuente\": \"Mukta\", \"radio\": 2}}"],
  ["correo", "{\"transporte\": null, \"remitente\": {\"nombre\": \"Chronos WMS\"}, \"plantillas\": {}}"],
  ["reportes", "{}"],
  ["regional", "{\"monedaPorDefecto\": \"MXN\", \"monedas\": [\"MXN\", \"USD\"], \"locale\": \"es-MX\", \"zonaHoraria\": \"America/Mexico_City\"}"]
];

export class Configuracion1794338006363 implements MigrationInterface {
    name = "Configuracion1794338006363";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`configuracion\` (\`seccion\` enum ('marca', 'correo', 'reportes', 'regional') NOT NULL, \`valor\` text NOT NULL, \`esquema\` int NOT NULL DEFAULT '1', \`version\` int NOT NULL, \`actualizado\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`seccion\`)) ENGINE=InnoDB`);
        for (const [seccion, valor] of POR_DEFECTO_V1) {
            await queryRunner.query("INSERT IGNORE INTO `configuracion` (`seccion`, `valor`, `esquema`, `version`) VALUES (?, ?, 1, 1)", [seccion, valor]);
        }
        await queryRunner.query("INSERT IGNORE INTO `rol` (`nombre`, `codigoRol`) VALUES ('Configuración del sistema', 'CONFIGURACION-EDITAR')");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM `rol` WHERE `codigoRol` = 'CONFIGURACION-EDITAR'");
        await queryRunner.query(`DROP TABLE \`configuracion\``);
    }
}
