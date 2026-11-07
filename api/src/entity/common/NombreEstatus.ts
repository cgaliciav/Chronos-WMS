import {PrimaryGeneratedColumn, Column, } from "typeorm";
import { Length } from "class-validator";

export enum EstatusEstado {
    ACTIVO = "activo",
    INACTIVO = "inactivo",
    FINALIZADO = "finalizado",
    ELIMINADO = "eliminado",
}

export abstract class NombreEstatus {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type:"varchar", length:255 , unique:true})
    @Length(3,255)
    nombre: string;

    @Column({type:"enum" , enum: EstatusEstado ,  default:EstatusEstado.ACTIVO})
    estatus:EstatusEstado;

}
