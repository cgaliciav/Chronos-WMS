import {Entity, Column,  CreateDateColumn, PrimaryGeneratedColumn, ManyToOne, OneToOne} from "typeorm";
import { Bodega } from "./Bodega";
import { GrupoDetalle } from "./GrupoDetalle";

@Entity()
export class InventarioDetalle {
    
    sesionId:number;

    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    fechaInicio:Date;

    @Column({nullable:true})
    fechaFin:Date;

    @ManyToOne(type => Bodega, bodega => bodega.inventariosDetalle,{eager:true})
    bodega:Bodega;
    
    @OneToOne(()=>GrupoDetalle, grupoDetalle => grupoDetalle.inventarioDetalle)
    grupoDetalle:GrupoDetalle;

    

}