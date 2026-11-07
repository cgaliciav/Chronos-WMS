import {Entity, ManyToMany, JoinTable, OneToMany} from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Comentario } from "./Comentario";
import { Producto } from "./Producto";


@Entity()
export class ProductoTipo extends NombreEstatus{

    sesionId:number;

    @OneToMany(type => Producto , producto => producto.productoTipo)
    productos:Producto[]


}
