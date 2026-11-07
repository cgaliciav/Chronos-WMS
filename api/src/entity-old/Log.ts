import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("log", { schema: "teleset_almacen_200414" })
export class Log {
  @PrimaryGeneratedColumn({ type: "int", name: "log_id", unsigned: true })
  logId: number;

  @Column("timestamp", {
    name: "log_fecha",
    default: () => "CURRENT_TIMESTAMP",
  })
  logFecha: Date;

  @Column("varchar", { name: "log_descripcion", nullable: true, length: 250 })
  logDescripcion: string | null;
}
