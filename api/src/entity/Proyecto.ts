import {Entity, ManyToOne, Column, OneToMany, ManyToMany, JoinTable} from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Movimiento } from "./Movimiento";
import { Comentario } from "./Comentario";
import { Grupo } from "./Grupo";
import { Operacion } from "./Operacion";
import { GrupoDetalle } from "./GrupoDetalle";
// import { Factura } from "./FacturaDetalle";


@Entity()
export class Proyecto extends NombreEstatus{

    sesionId:number;

    @Column()
    descripcion:string;

    @Column()
    fechaInicio:Date;

    @Column({ type:"varchar", length:200 })
    productor:string;

    @Column({default:false})
    esExterno:Boolean;
    
    @OneToMany( type => GrupoDetalle, grupoDetalle => grupoDetalle.proyecto)
    gruposDetalle:GrupoDetalle[];

    @OneToMany( type => Operacion, operacion => operacion.proyecto)
    operaciones:Operacion[];

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];


}
