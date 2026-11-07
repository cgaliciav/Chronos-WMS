import {Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, ManyToOne} from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";
import { Producto } from "./Producto";
import { PrecioTipo } from "./PrecioTipo";
import { Comentario } from "./Comentario";

@Entity()
export class ProductoPrecio {
    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    
    @Column({type:"numeric", precision:15 , scale:4, transformer: numericTransformer })
    precio:number;

    @Column({type:"varchar", length:3, default:"MXP" })
    moneda:string;

    @ManyToOne(type => PrecioTipo , precioTipo => precioTipo.productoPrecios,{eager:true})
    precioTipo:PrecioTipo;

    @ManyToOne(type => Producto , producto => producto.productoPrecios) // inverso corregido (hallazgo M29)
    producto:Producto;

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];

}