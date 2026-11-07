import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BodegasProductos } from "./BodegasProductos";
import { Productos } from "./Productos";

@Entity("bodegas", { schema: "teleset_almacen_200414" })
export class Bodegas {
  @PrimaryGeneratedColumn({ type: "int", name: "bodega_id", unsigned: true })
  bodegaId: number;

  @Column("varchar", { name: "bode_nombre", length: 250 })
  bodeNombre: string;

  @Column("varchar", { name: "bode_descripcion", nullable: true, length: 1000 })
  bodeDescripcion: string | null;

  @Column("char", {
    name: "bode_estatus",
    nullable: true,
    length: 1,
    default: () => "'1'",
  })
  bodeEstatus: string | null;

  @OneToMany(
    () => BodegasProductos,
    (bodegasProductos) => bodegasProductos.bodega
  )
  bodegasProductos: BodegasProductos[];

  @OneToMany(() => Productos, (productos) => productos.bodega)
  productos: Productos[];
}
