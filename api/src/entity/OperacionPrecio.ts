import {Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, ManyToOne} from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";
import { Producto } from "./Producto";
import { PrecioTipo } from "./PrecioTipo";
import { Operacion } from "./Operacion";

@Entity()
export class OperacionPrecio {
    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    
    @Column({type:"numeric", precision:15 , scale:4, transformer: numericTransformer })
    precio:number

    @ManyToOne(type => PrecioTipo , precioTipo => precioTipo.productoPrecios,{eager:true})
    precioTipo:PrecioTipo;

    @ManyToOne(type => Operacion , operacion => operacion.operacionPrecios)
    operacion:Operacion;

}