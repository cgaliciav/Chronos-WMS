import {Entity, ManyToMany, JoinTable, OneToMany} from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Comentario } from "./Comentario";
import { ProductoPrecio } from "./ProductoPrecio";


@Entity()
export class PrecioTipo extends NombreEstatus{

    sesionId:number;

    @OneToMany(type => ProductoPrecio, productoPrecio => productoPrecio.precioTipo)
    productoPrecios:ProductoPrecio[];

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];


}
