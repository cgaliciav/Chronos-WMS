import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MovimientosProductos } from "./MovimientosProductos";

@Index("mov_pro_ind", ["movimientoProductoId"], {})
@Entity("bitacora", { schema: "teleset_almacen_200414" })
export class Bitacora {
  @PrimaryGeneratedColumn({ type: "int", name: "bitacora_id", unsigned: true })
  bitacoraId: number;

  @Column("int", { name: "usuario_id", unsigned: true })
  usuarioId: number;

  @Column("timestamp", {
    name: "bita_fecha",
    default: () => "CURRENT_TIMESTAMP",
  })
  bitaFecha: Date;

  @Column("int", { name: "movimiento_producto_id", unsigned: true })
  movimientoProductoId: number;

  @ManyToOne(
    () => MovimientosProductos,
    (movimientosProductos) => movimientosProductos.bitacoras,
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
