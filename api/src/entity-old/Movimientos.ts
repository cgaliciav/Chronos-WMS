import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MovimientosProductos } from "./MovimientosProductos";

@Entity("movimientos", { schema: "teleset_almacen_200414" })
export class Movimientos {
  @PrimaryGeneratedColumn({
    type: "int",
    name: "movimiento_id",
    unsigned: true,
  })
  movimientoId: number;

  @Column("varchar", { name: "movi_nombre", nullable: true, length: 100 })
  moviNombre: string | null;

  @Column("char", {
    name: "movi_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  moviEstatus: string | null;

  @OneToMany(
    () => MovimientosProductos,
    (movimientosProductos) => movimientosProductos.movimiento
  )
  movimientosProductos: MovimientosProductos[];
}
