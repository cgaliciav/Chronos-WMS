import {Entity, Column, OneToMany,} from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { InventarioActual } from "./InventarioActual";
import { InventarioDetalle } from "./InventarioDetalle";

@Entity()
export class Bodega extends NombreEstatus{

    sesionId:number;

    @Column()
    descripcion:string;

    @Column()
    cobacha:boolean;


    @OneToMany(type => InventarioActual, inventarioActual => inventarioActual.bodega )
    inventariosActual:InventarioActual[];

    @OneToMany(type => InventarioDetalle, inventarioDetalle => inventarioDetalle.bodega )
    inventariosDetalle:InventarioDetalle[];


}
