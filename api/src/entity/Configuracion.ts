import { Column, Entity, PrimaryColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { SECCIONES, Seccion } from "../esquemas/configuracion";

/**
 * Configuración por cliente (plan 03 §2.1): una fila por sección (`marca`, `correo`, `reportes`, `regional`). El JSON
 * se valida con el esquema zod de la sección al guardar y al leer (`ConfiguracionService`). `version` sirve de
 * bloqueo optimista (409) y de ETag.
 */
@Entity()
export class Configuracion {
  /** Auditoría (GeneralSubscriber), como el resto de entidades; no es columna. */
  sesionId: number;

  @PrimaryColumn({ type: "enum", enum: SECCIONES })
  seccion: Seccion;

  /** JSON de la sección. `simple-json` (texto) y no `json`: MariaDB lo guarda como LONGTEXT y el generador vería diferencias. */
  @Column({ type: "simple-json" })
  valor: unknown;

  /** Versión del esquema del JSON (`VERSION_ESQUEMA`). */
  @Column({ type: "int", default: 1 })
  esquema: number;

  @VersionColumn()
  version: number;

  @UpdateDateColumn()
  actualizado: Date;
}
