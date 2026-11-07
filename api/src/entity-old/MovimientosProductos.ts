import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Bitacora } from "./Bitacora";
import { BodegasProductos } from "./BodegasProductos";
import { Movimientos } from "./Movimientos";
import { ProyectosProductos } from "./ProyectosProductos";

@Index("movi_ind", ["movimientoId"], {})
@Index(
  "movimientos_productos_mov_prod_fecha_inicio_idx1",
  ["movProdFechaInicio", "movProdFechaFin"],
  {}
)
@Index(
  "movimientos_productos_mov_prod_fecha_inicio_idx2",
  ["movProdFechaInicio"],
  {}
)
@Index("movimientos_productos_mov_prod_fecha_fin_idx3", ["movProdFechaFin"], {})
@Entity("movimientos_productos", { schema: "teleset_almacen_200414" })
export class MovimientosProductos {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "movimiento_producto_id",
    unsigned: true,
  })
  movimientoProductoId: number;

  @Column("date", { name: "mov_prod_fecha_inicio" })
  movProdFechaInicio: string;

  @Column("date", { name: "mov_prod_fecha_fin", nullable: true })
  movProdFechaFin: string | null;

  @Column("int", { name: "movimiento_id", nullable: true, unsigned: true })
  movimientoId: number | null;

  @Column("char", {
    name: "mov_prod_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  movProdEstatus: string | null;

  @OneToMany(() => Bitacora, (bitacora) => bitacora.movimientoProducto)
  bitacoras: Bitacora[];

  @OneToMany(
    () => BodegasProductos,
    (bodegasProductos) => bodegasProductos.movimientoProducto
  )
  bodegasProductos: BodegasProductos[];

  @ManyToOne(
    () => Movimientos,
    (movimientos) => movimientos.movimientosProductos,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([{ name: "movimiento_id", referencedColumnName: "movimientoId" }])
  movimiento: Movimientos;

  @OneToMany(
    () => ProyectosProductos,
    (proyectosProductos) => proyectosProductos.movimientoProducto
  )
  proyectosProductos: ProyectosProductos[];
}
