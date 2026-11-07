import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Perfiles } from "./Perfiles";

@Index("per_ind", ["perfilId"], {})
@Entity("usuarios", { schema: "teleset_almacen_200414" })
export class Usuarios {
  @PrimaryGeneratedColumn({ type: "int", name: "usuario_id", unsigned: true })
  usuarioId: number;

  @Column("varchar", { name: "usua_nombre", length: 250 })
  usuaNombre: string;

  @Column("varchar", { name: "usua_correo", length: 250 })
  usuaCorreo: string;

  @Column("varchar", { name: "usua_password", length: 32 })
  usuaPassword: string;

  @Column("char", {
    name: "usua_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  usuaEstatus: string | null;

  @Column("int", { name: "perfil_id", nullable: true, unsigned: true })
  perfilId: number | null;

  @ManyToOne(() => Perfiles, (perfiles) => perfiles.usuarios, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "perfil_id", referencedColumnName: "perfilId" }])
  perfil: Perfiles;
}
