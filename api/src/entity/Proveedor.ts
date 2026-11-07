import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany, } from "typeorm";
import { Comentario } from "./Comentario";
import { FacturaDetalle } from "./FacturaDetalle";
import { NombreEstatus } from "./common/NombreEstatus";


@Entity()
export class Proveedor extends NombreEstatus{

    sesionId:number;

    // TODO: EL RFC DEBE SER ÚNICO, EXCEPTO LOS GENÉRICOS: INTERNACIONALES Y NACIONALES
    @Index({unique:false})
    @Column({type:"varchar", length:30, nullable:true})
    RFCEmite:string;

    @OneToMany(type=>FacturaDetalle, facturaDetalle => facturaDetalle.proveedor)
    facturasDetalle:FacturaDetalle[];

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];



}
