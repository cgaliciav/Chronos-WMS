import {Entity, ManyToOne, Column, PrimaryGeneratedColumn, CreateDateColumn} from "typeorm";
import { Sesion } from './Sesion'

export enum FuncionamientoEstado {
    NUEVO = "instert",
    ACTUALIZACION = "update",
    DESACTIVACION = "soft-delete",
    ELIMINACION = "delete",
}

@Entity()
export class LogFuncionamiento{


    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    fecha:Date;

    @Column("int")
    idOrigen:number;

    @Column({ type:"text" })
    data:string;

    @Column({type:"enum" , enum: FuncionamientoEstado ,  default:FuncionamientoEstado.ACTUALIZACION})
    funcionamiento:string;

    @Column()
    entidadOrigen:string;

    @ManyToOne(type => Sesion, sesion => sesion.logsFuncionamiento,{eager:true})
    sesion:Sesion;
}
