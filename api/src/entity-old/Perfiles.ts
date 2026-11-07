import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Usuarios } from "./Usuarios";

@Entity("perfiles", { schema: "teleset_almacen_200414" })
export class Perfiles {
  @PrimaryGeneratedColumn({ type: "int", name: "perfil_id", unsigned: true })
  perfilId: number;

  @Column("varchar", { name: "perf_nombre", length: 30 })
  perfNombre: string;

  @Column("char", {
    name: "perf_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  perfEstatus: string | null;

  @OneToMany(() => Usuarios, (usuarios) => usuarios.perfil)
  usuarios: Usuarios[];
}
