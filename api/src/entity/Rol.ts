import {Entity, Column, ManyToMany, JoinTable, } from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Comentario } from "./Comentario";

@Entity()
export class Rol extends NombreEstatus {

    sesionId:number;

    @Column({ type:"varchar", length:60 , unique:true})
    codigoRol: string; // Codigo (nombre) interno del rol o permiso

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];

}
