import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Productos } from "./Productos";
import { Proyectos } from "./Proyectos";

@Index("compras_fk1_idx", ["productoId"], {})
@Index("compras_fk2_idx", ["proyectoId"], {})
@Index("otroindicetest", ["compraId"], {})
@Entity("compras", { schema: "teleset_almacen_200414" })
export class Compras {
  @PrimaryGeneratedColumn({ type: "int", name: "compra_id" })
  compraId: number;

  @Column("int", {
    name: "producto_id",
    nullable: true,
    unsigned: true,
    default: () => "'0'",
  })
  productoId: number | null;

  @Column("int", {
    name: "proyecto_id",
    nullable: true,
    unsigned: true,
    default: () => "'0'",
  })
  proyectoId: number | null;

  @Column("datetime", {
    name: "compra_fecha",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  compraFecha: Date | null;

  @Column("int", {
    name: "factura_id",
    nullable: true,
    unsigned: true,
    default: () => "'0'",
  })
  facturaId: number | null;

  @ManyToOne(() => Productos, (productos) => productos.compras, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
    eager:true
  })
  @JoinColumn([{ name: "producto_id", referencedColumnName: "productoId" }])
  producto: Productos;

  @ManyToOne(() => Proyectos, (proyectos) => proyectos.compras, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "proyecto_id", referencedColumnName: "proyectoId" }])
  proyecto: Proyectos;
}
