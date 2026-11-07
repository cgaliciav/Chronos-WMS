import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Bodegas } from "./Bodegas";
import { Productos } from "./Productos";
import { MovimientosProductos } from "./MovimientosProductos";

@Index("bode_ind", ["bodegaId"], {})
@Index("prod_ind", ["productoId"], {})
@Index("mov_pro_ind", ["movimientoProductoId"], {})
@Entity("bodegas_productos", { schema: "teleset_almacen_200414" })
export class BodegasProductos {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "bodega_producto_id",
    unsigned: true,
  })
  bodegaProductoId: number;

  @Column("int", { name: "bodega_id", unsigned: true })
  bodegaId: number;

  @Column("int", { name: "producto_id", unsigned: true })
  productoId: number;

  @Column("int", { name: "movimiento_producto_id", unsigned: true })
  movimientoProductoId: number;

  @Column("int", {
    name: "cantidad_producto",
    nullable: true,
    default: () => "'1'",
  })
  cantidadProducto: number | null;

  @Column("char", {
    name: "bod_prod_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  bodProdEstatus: string | null;

  @ManyToOne(() => Bodegas, (bodegas) => bodegas.bodegasProductos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "bodega_id", referencedColumnName: "bodegaId" }])
  bodega: Bodegas;

  @ManyToOne(() => Productos, (productos) => productos.bodegasProductos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "producto_id", referencedColumnName: "productoId" }])
  producto: Productos;

  @ManyToOne(
    () => MovimientosProductos,
    (movimientosProductos) => movimientosProductos.bodegasProductos,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    {
      name: "movimiento_producto_id",
      referencedColumnName: "movimientoProductoId",
    },
  ])
  movimientoProducto: MovimientosProductos;
}
