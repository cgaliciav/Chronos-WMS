import { Entity, OneToMany } from "typeorm";
import { NombreEstatus } from './common/NombreEstatus';
import { Producto } from "./Producto";


@Entity()
export class Area extends NombreEstatus{

    sesionId:number;

    @OneToMany(type => Producto , producto => producto.area)
    productos:Producto[]

}
