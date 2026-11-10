import { Entity, OneToMany } from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Producto } from "./Producto";


@Entity()
export class ProductoTipo extends NombreEstatus{

    sesionId:number;

    @OneToMany(type => Producto , producto => producto.productoTipo)
    productos:Producto[]


}
