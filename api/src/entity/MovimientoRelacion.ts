import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";
import { Movimiento } from "./Movimiento";

import { RelacionTipo } from "./common/RelacionTipo";

export { RelacionTipo };

/**
 * Relación N:M entre un movimiento ORIGEN (salida: 3, 11, 12, 15; o 7 para su 12) y un movimiento DERIVADO
 * (regreso: 4, 7, 13, 16, 5; baja libre: 8, 17; o 12 respecto de su 7). `cantidad` es cuánto del derivado se
 * aplica a ese origen. Saldo pendiente del origen = origen.cantidad − Σ cantidad (vista `v_movimiento_saldo`).
 * Plan 02 §2.1.
 */
@Entity()
@Unique(["origen", "derivado"])
export class MovimientoRelacion {
  sesionId: number;

  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Movimiento, (m) => m.relacionesComoOrigen, { nullable: false, onDelete: "RESTRICT" })
  origen: Movimiento;

  @Index()
  @ManyToOne(() => Movimiento, (m) => m.relacionesComoDerivado, { nullable: false, onDelete: "CASCADE" })
  derivado: Movimiento;

  @Column({ type: "numeric", precision: 15, scale: 4, transformer: numericTransformer })
  cantidad: number;

  @Column({ type: "enum", enum: RelacionTipo })
  tipo: RelacionTipo;

  @CreateDateColumn()
  fecha: Date;
}
