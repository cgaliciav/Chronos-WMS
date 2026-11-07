import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

@Entity()
export class LogPeticiones {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  fecha: Date;

  @Column("boolean")
  ok: boolean;

  @Column("bigint")
  time: number;

  @Column()
  reqMethod: string;

  @Column()
  reqPath: string;

  @Column()
  reqIp: string;

  @Column("bigint")
  reqBytes: number;

  @Column("bigint")
  resBytes: number;

  @Column("smallint")
  resStatus: number;
}
