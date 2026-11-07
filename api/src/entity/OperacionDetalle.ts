import {Entity, PrimaryGeneratedColumn, Column, OneToOne,} from "typeorm";
import { Operacion } from "./Operacion";

@Entity()
export class OperacionDetalle { //DATOS ADICIONALES DEL MOVIMIENTO EN CASO DE COMPRA

    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type:"numeric", precision:15 , scale:2 })
    precioUnitario:number;

    @Column({type:"numeric", precision:15 , scale:2 })
    precioTotal:number;

    @Column({type:"varchar", length:3, default:"MXP" })
    moneda:string;

    @OneToOne(()=> Operacion, operacion => operacion.operacionDetalle)
    operacion:Operacion;

}