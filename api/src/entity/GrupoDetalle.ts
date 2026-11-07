import {Entity, ManyToMany, JoinTable, ManyToOne, Index, OneToOne, JoinColumn, PrimaryGeneratedColumn} from "typeorm";
import { Proyecto } from "./Proyecto";
import { Usuario } from "./Usuario";
import { MovimientoTipo } from "./MovimientoTipo";
import { FacturaDetalle } from "./FacturaDetalle";
import { InventarioDetalle } from "./InventarioDetalle";
import { Grupo } from "./Grupo";


@Entity()
export class GrupoDetalle {

    @PrimaryGeneratedColumn()
    id: number;

    sesionId:number;

    @ManyToOne(type => Proyecto, proyecto => proyecto.gruposDetalle,{eager:true})
    proyecto:Proyecto;

    @Index()
    @ManyToOne(type => MovimientoTipo, movimientoTipo => movimientoTipo.gruposDetalle,{eager:true})
    movimientoTipo:MovimientoTipo;

    @ManyToMany(type => Usuario)
    @JoinTable()
    usuarios:Usuario[]; 

    @OneToOne(()=>FacturaDetalle, facturaDetalle => facturaDetalle.grupoDetalle)
    @JoinColumn()
    facturaDetalle:FacturaDetalle;

    @OneToOne(()=>InventarioDetalle, inventarioDetalle => inventarioDetalle.grupoDetalle)
    @JoinColumn()
    inventarioDetalle:InventarioDetalle;

    @OneToOne(()=>Grupo, grupo => grupo.grupoDetalle)
    grupo:Grupo;



}