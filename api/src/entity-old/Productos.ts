import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BodegasProductos } from "./BodegasProductos";
import { Compras } from "./Compras";
import { Bodegas } from "./Bodegas";
import { ProductosArchivos } from "./ProductosArchivos";
import { ProductosCategorias } from "./ProductosCategorias";
import { ProyectosProductos } from "./ProyectosProductos";

@Index("bode_ind", ["bodegaId"], {})
@Index(
  "idx_productos_prod_clave_prod_nombre_prod_descripcion",
  ["prodClave", "prodNombre", "prodDescripcion"],
  {}
)
@Entity("productos", { schema: "teleset_almacen_200414" })
export class Productos {
  @PrimaryGeneratedColumn({ type: "int", name: "producto_id", unsigned: true })
  productoId: number;

  @Column("varchar", { name: "prod_clave", length: 100 })
  prodClave: string;

  @Column("varchar", { name: "prod_nombre", nullable: true, length: 250 })
  prodNombre: string | null;

  @Column("varchar", { name: "prod_descripcion", nullable: true, length: 1000 })
  prodDescripcion: string | null;

  @Column("float", {
    name: "prod_precio",
    nullable: true,
    precision: 12,
    scale: 2,
    default: () => "'0.00'",
  })
  prodPrecio: number | null;

  @Column("varchar", {
    name: "prod_orden_bodega",
    nullable: true,
    length: 1000,
  })
  prodOrdenBodega: string | null;

  @Column("int", { name: "prod_total", nullable: true })
  prodTotal: number | null;

  @Column("int", { name: "prod_version", nullable: true, unsigned: true })
  prodVersion: number | null;

  @Column("char", {
    name: "prod_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  prodEstatus: string | null;

  @Column("int", { name: "bodega_id", unsigned: true })
  bodegaId: number;

  @Column("varchar", { name: "prod_factura", nullable: true, length: 45 })
  prodFactura: string | null;

  @Column("int", {
    name: "proveedores_id",
    unsigned: true,
    default: () => "'1'",
  })
  proveedoresId: number;

  @OneToMany(
    () => BodegasProductos,
    (bodegasProductos) => bodegasProductos.producto,{eager: true}
  )
  bodegasProductos: BodegasProductos[];

  @OneToMany(() => Compras, (compras) => compras.producto)
  compras: Compras[];

  @ManyToOne(() => Bodegas, (bodegas) => bodegas.productos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
    eager: true
  })
  @JoinColumn([{ name: "bodega_id", referencedColumnName: "bodegaId" }])
  bodega: Bodegas;

  @OneToMany(
    () => ProductosArchivos,
    (productosArchivos) => productosArchivos.producto,
    {eager: true}
  )
  productosArchivos: ProductosArchivos[];

  @OneToMany(
    () => ProductosCategorias,
    (productosCategorias) => productosCategorias.producto,
    {eager: true}
  )
  productosCategorias: ProductosCategorias[];

  @OneToMany(
    () => ProyectosProductos,
    (proyectosProductos) => proyectosProductos.producto
    // ,{eager: true}
  )
  proyectosProductos: ProyectosProductos[];
}
