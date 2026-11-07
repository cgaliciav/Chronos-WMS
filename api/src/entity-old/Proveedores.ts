import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("proveedores", { schema: "teleset_almacen_200414" })
export class Proveedores {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "proveedores_id",
    unsigned: true,
  })
  proveedoresId: number;

  @Column("varchar", { name: "prov_nombre", length: 250 })
  provNombre: string;

  @Column("char", {
    name: "prov_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  provEstatus: string | null;
}
