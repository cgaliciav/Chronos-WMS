import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Proyectos } from "./Proyectos";
import { Productos } from "./Productos";
import { MovimientosProductos } from "./MovimientosProductos";

@Index("proy_ind", ["proyectoId"], {})
@Index("prod_ind", ["productoId"], {})
@Index("mov_pro_ind", ["movimientoProductoId"], {})
@Entity("proyectos_productos", { schema: "teleset_almacen_200414" })
export class ProyectosProductos {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "proyecto_producto_id",
    unsigned: true,
  })
  proyectoProductoId: number;

  @Column("int", { name: "proyecto_id", unsigned: true })
  proyectoId: number;

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
    name: "proy_prod_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  proyProdEstatus: string | null;

  @ManyToOne(() => Proyectos, (proyectos) => proyectos.proyectosProductos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
    eager: true
  })
  @JoinColumn([{ name: "proyecto_id", referencedColumnName: "proyectoId" }])
  proyecto: Proyectos;

  @ManyToOne(() => Productos, (productos) => productos.proyectosProductos, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
    // eager: true
  })
  @JoinColumn([{ name: "producto_id", referencedColumnName: "productoId" }])
  producto: Productos;

  @ManyToOne(
    () => MovimientosProductos,
    (movimientosProductos) => movimientosProductos.proyectosProductos,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" , eager: true}
  )
  @JoinColumn([
    {
      name: "movimiento_producto_id",
      referencedColumnName: "movimientoProductoId",
    },
  ])
  movimientoProducto: MovimientosProductos;
}
