import {Entity,  Column, PrimaryGeneratedColumn, CreateDateColumn} from "typeorm";

export enum LogTipo {
    ERROR = "error",
    WARN = "advertencia",
    INFO = "informacion",
    DEBUG = "debug",
    SILLY = "torpeza",
}

@Entity()
export class LogGeneral{

    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    fecha:Date;

    @Column()
    mensaje:string;

    @Column({ type:"text" })
    data:string;

    @Column({type:"enum" , enum: LogTipo ,  default:LogTipo.INFO})
    tipo:string;

}
