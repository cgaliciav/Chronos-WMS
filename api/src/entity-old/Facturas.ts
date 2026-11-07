import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("facturas", { schema: "teleset_almacen_200414" })
export class Facturas {
  @PrimaryGeneratedColumn({ type: "int", name: "factura_id" })
  facturaId: number;

  @Column("int", { name: "proveedores_id", nullable: true })
  proveedoresId: number | null;

  @Column("varchar", { name: "fact_numero", nullable: true, length: 45 })
  factNumero: string | null;

  @Column("longtext", { name: "fact_XML", nullable: true })
  factXml: string | null;

  @Column("decimal", {
    name: "fact_total",
    nullable: true,
    precision: 16,
    scale: 4,
  })
  factTotal: string | null;

  @Column("decimal", {
    name: "fact_impuestos",
    nullable: true,
    precision: 16,
    scale: 4,
  })
  factImpuestos: string | null;

  @Column("decimal", {
    name: "fact_no_ingresado",
    nullable: true,
    precision: 16,
    scale: 4,
  })
  factNoIngresado: string | null;

  @Column("int", { name: "proyecto_id", nullable: true })
  proyectoId: number | null;

  @Column("varchar", {
    name: "fact_tipo",
    nullable: true,
    comment: "NOTA,FACTURA,COMPROBANTE TELESET",
    length: 45,
  })
  factTipo: string | null;

  @Column("int", { name: "fact_estatus", nullable: true, default: () => "'1'" })
  factEstatus: number | null;
}
