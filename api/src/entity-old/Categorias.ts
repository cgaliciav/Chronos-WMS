import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CategoriasRelaciones } from "./CategoriasRelaciones";

@Entity("categorias", { schema: "teleset_almacen_200414" })
export class Categorias {
  @PrimaryGeneratedColumn({ type: "int", name: "categoria_id", unsigned: true })
  categoriaId: number;

  @Column("varchar", { name: "cate_nombre", nullable: true, length: 100 })
  cateNombre: string | null;

  @Column("char", {
    name: "cate_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  cateEstatus: string | null;

  @OneToMany(
    () => CategoriasRelaciones,
    (categoriasRelaciones) => categoriasRelaciones.categoriaIdOrigen2
    // , {eager:true}
  )
  categoriasRelaciones: CategoriasRelaciones[];

  @OneToMany(
    () => CategoriasRelaciones,
    (categoriasRelaciones) => categoriasRelaciones.categoriaIdDestino2
    // ,{eager:true}
  )
  categoriasRelaciones2: CategoriasRelaciones[];
}
