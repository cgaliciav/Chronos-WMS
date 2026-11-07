import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("bajas", { schema: "teleset_almacen_200414" })
export class Bajas {
  @PrimaryGeneratedColumn({ type: "int", name: "baja_id" })
  bajaId: number;

  @Column("varchar", {
    name: "baja_comentario",
    nullable: true,
    length: 500,
    default: () => "'-'",
  })
  bajaComentario: string | null;

  @Column("int", { name: "producto_id", nullable: true })
  productoId: number | null;

  @Column("int", { name: "baja_estatus", nullable: true, default: () => "'1'" })
  bajaEstatus: number | null;

  @Column("datetime", {
    name: "baja_fecha",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  bajaFecha: Date | null;
}
