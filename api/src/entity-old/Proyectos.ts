import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Compras } from "./Compras";
import { ProyectosProductos } from "./ProyectosProductos";

@Entity("proyectos", { schema: "teleset_almacen_200414" })
export class Proyectos {
  @PrimaryGeneratedColumn({ type: "int", name: "proyecto_id", unsigned: true })
  proyectoId: number;

  @Column("varchar", { name: "proy_nombre", length: 250 })
  proyNombre: string;

  @Column("varchar", { name: "proy_descripcion", nullable: true, length: 1000 })
  proyDescripcion: string | null;

  @Column("date", { name: "proy_fecha_inicio" })
  proyFechaInicio: string;

  @Column("date", { name: "proy_fecha_fin", nullable: true })
  proyFechaFin: string | null;

  @Column("char", {
    name: "proy_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  proyEstatus: string | null;

  @OneToMany(() => Compras, (compras) => compras.proyecto,{eager: true})
  compras: Compras[];

  @OneToMany(
    () => ProyectosProductos,
    (proyectosProductos) => proyectosProductos.proyecto,
    
  )
  proyectosProductos: ProyectosProductos[];
}
