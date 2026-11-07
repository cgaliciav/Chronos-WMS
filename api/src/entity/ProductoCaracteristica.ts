import { indexOf } from "lodash";
import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index} from "typeorm";
import { Producto } from "./Producto";

@Entity()
export class ProductoCaracteristica {
    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({type: "varchar" , length:60})
    llave:string;

    @Column()
    valor:string;

    @ManyToOne(type => Producto , producto => producto.productoCaracteristicas)
    producto:Producto;

}