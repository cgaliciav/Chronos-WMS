import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CategoriasRelaciones } from "./CategoriasRelaciones";
import { Productos } from "./Productos";

@Index("cate_ind", ["categoriaRelacionId"], {})
@Index("prod_ind", ["productoId"], {})
@Entity("productos_categorias", { schema: "teleset_almacen_200414" })
export class ProductosCategorias {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "producto_categoria_id",
    unsigned: true,
  })
  productoCategoriaId: number;

  @Column("int", { name: "categoria_relacion_id", unsigned: true })
  categoriaRelacionId: number;

  @Column("int", { name: "producto_id", unsigned: true })
  productoId: number;

  @ManyToOne(
    () => CategoriasRelaciones,
    (categoriasRelaciones) => categoriasRelaciones.productosCategorias,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT", eager:true }
  )
  @JoinColumn([
    {
      name: "categoria_relacion_id",
      referencedColumnName: "categoriaRelacionId",
    },
  ])
  categoriaRelacion: CategoriasRelaciones;

  @ManyToOne(() => Productos, (productos) => productos.productosCategorias, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "producto_id", referencedColumnName: "productoId" }])
  producto: Productos;
}
