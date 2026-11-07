import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Categorias } from "./Categorias";
import { ProductosCategorias } from "./ProductosCategorias";

@Index("cat_padre_ind", ["categoriaIdOrigen"], {})
@Index("cat_hijo_ind", ["categoriaIdDestino"], {})
@Entity("categorias_relaciones", { schema: "teleset_almacen_200414" })
export class CategoriasRelaciones {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "categoria_relacion_id",
    unsigned: true,
  })
  categoriaRelacionId: number;

  @Column("int", {
    name: "categoria_id_origen",
    nullable: true,
    unsigned: true,
  })
  categoriaIdOrigen: number | null;

  @Column("int", {
    name: "categoria_id_destino",
    nullable: true,
    unsigned: true,
  })
  categoriaIdDestino: number | null;

  @ManyToOne(
    () => Categorias,
    (categorias) => categorias.categoriasRelaciones,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT"
    , eager:true
  }
  )
  @JoinColumn([
    { name: "categoria_id_origen", referencedColumnName: "categoriaId" },
  ])
  categoriaIdOrigen2: Categorias;

  @ManyToOne(
    () => Categorias,
    (categorias) => categorias.categoriasRelaciones2, 
    { onDelete: "RESTRICT", onUpdate: "RESTRICT"
    , eager:true
  }
  )
  @JoinColumn([
    { name: "categoria_id_destino", referencedColumnName: "categoriaId" },
  ])
  categoriaIdDestino2: Categorias;

  @OneToMany(
    () => ProductosCategorias,
    (productosCategorias) => productosCategorias.categoriaRelacion
  )
  productosCategorias: ProductosCategorias[];
}
