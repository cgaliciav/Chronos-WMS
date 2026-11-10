import { Entity, Column, OneToMany, ManyToMany, JoinTable } from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Comentario } from "./Comentario";
import { Operacion } from "./Operacion";
import { GrupoDetalle } from "./GrupoDetalle";


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
    esExterno:boolean;
    
    @OneToMany( type => GrupoDetalle, grupoDetalle => grupoDetalle.proyecto)
    gruposDetalle:GrupoDetalle[];

    @OneToMany( type => Operacion, operacion => operacion.proyecto)
    operaciones:Operacion[];

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];


}
