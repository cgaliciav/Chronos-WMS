import {Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, ManyToOne} from "typeorm";
import { Producto } from "./Producto";
import { PrecioTipo } from "./PrecioTipo";
import { Comentario } from "./Comentario";

@Entity()
export class ProductoPrecio {
    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    
    @Column({type:"numeric", precision:15 , scale:4 })
    precio:number;

    @Column({type:"varchar", length:3, default:"MXP" })
    moneda:string;

    @ManyToOne(type => PrecioTipo , precioTipo => precioTipo.productoPrecios,{eager:true})
    precioTipo:PrecioTipo;

    @ManyToOne(type => Producto , producto => producto.productoCaracteristicas)
    producto:Producto;

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];

}