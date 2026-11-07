import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("productos_facturas", { schema: "teleset_almacen_200414" })
export class ProductosFacturas {
  @PrimaryGeneratedColumn({ type: "int", name: "producto_factura" })
  productoFactura: number;

  @Column("int", { name: "producto_id", nullable: true })
  productoId: number | null;

  @Column("int", { name: "factura_id", nullable: true })
  facturaId: number | null;

  @Column("int", {
    name: "prod_fact_estatus",
    nullable: true,
    default: () => "'1'",
  })
  prodFactEstatus: number | null;
}
