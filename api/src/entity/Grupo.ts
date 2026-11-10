import { Entity, ManyToMany, JoinTable, CreateDateColumn, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import { NombreEstatus } from "./common/NombreEstatus";
import { Movimiento } from "./Movimiento";
import { Comentario } from "./Comentario";
import { Sesion } from "./Sesion";
import { Archivo } from "./Archivo";
import { GrupoDetalle } from "./GrupoDetalle";


@Entity()
export class Grupo extends NombreEstatus{

    sesionId:number;

    @ManyToOne(type => Sesion, sesion => sesion.grupos,{eager:true})
    sesion:Sesion;

    @CreateDateColumn()
    fecha:Date;

    @ManyToMany(() => Movimiento, movimiento=>movimiento.grupos)
    @JoinTable()
    movimientos:Movimiento[];

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];

    @ManyToMany(type => Archivo)
    @JoinTable()
    archivos:Archivo[];

    @OneToOne(() => GrupoDetalle, grupoDetalle => grupoDetalle.grupo,{eager:true})
    @JoinColumn()
    grupoDetalle:GrupoDetalle;

}