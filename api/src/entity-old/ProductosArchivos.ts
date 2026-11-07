import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Productos } from "./Productos";

@Index("prod_ind", ["productoId"], {})
@Entity("productos_archivos", { schema: "teleset_almacen_200414" })
export class ProductosArchivos {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "producto_archivo_id",
    unsigned: true,
  })
  productoArchivoId: number;

  @Column("varchar", { name: "prod_arch_ubucacion_nombre", length: 250 })
  prodArchUbucacionNombre: string;

  @Column("int", { name: "producto_id", unsigned: true })
  productoId: number;

  @ManyToOne(() => Productos, (productos) => productos.productosArchivos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "producto_id", referencedColumnName: "productoId" }])
  producto: Productos;
}
