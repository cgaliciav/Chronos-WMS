import {Entity, ManyToOne, PrimaryGeneratedColumn, Column, CreateDateColumn} from "typeorm";
import { Sesion } from "./Sesion";

@Entity()
export class Comentario {

    sesionId:number;

    @PrimaryGeneratedColumn ()
    id: number;

    @Column ({ type:"text"})
    comentario: string;

    @CreateDateColumn()
    fecha:Date;

    @ManyToOne(type => Sesion, sesion => sesion.comentarios,{eager:true})
    sesion:Sesion;

}
