import {Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne} from "typeorm";
import { Producto } from "./Producto";

@Entity()
export class ProductoClave {
    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    // @Index({unique:true})
    // @Column({type:"varchar" , length:"20"})
    // clave:string;

    @Index({unique:true})
    @Column({type:"varchar" , length:"40"})
    barras:string;

    @Column({type:"varchar" , length:"20"})
    barrasTipo:string;

    @ManyToOne(type => Producto, producto => producto.productoClaves)
    producto : Producto;

}