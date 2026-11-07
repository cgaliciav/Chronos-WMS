import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne, ManyToMany,} from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";

import { InventarioActual } from "./InventarioActual";
import { Producto } from "./Producto";
import { Sesion } from "./Sesion";
import { EstatusEstado } from "./common/NombreEstatus";
import { Operacion } from "./Operacion";
import { Grupo } from "./Grupo";

@Entity()
export class Movimiento {

    sesionId:number;

    @PrimaryGeneratedColumn()
    id: number;

    @Column({type:"numeric", precision:15 , scale:4, transformer: numericTransformer })
    cantidad:number;

    @Column({type:"enum" , enum: EstatusEstado ,  default:EstatusEstado.ACTIVO})
    estatus:EstatusEstado;

    @ManyToOne(type => Sesion, sesion => sesion.movimientos,{eager:true})
    sesion:Sesion;

    @ManyToOne(type => InventarioActual, inventarioActual => inventarioActual.movimientos,{eager:true})
    inventarioActual:InventarioActual;

    @OneToOne(() => Operacion, operacion => operacion.movimiento)
    @JoinColumn()
    operacion:Operacion;

    @ManyToMany(()=>Grupo, grupo=> grupo.movimientos)
    grupos:Grupo[];

}