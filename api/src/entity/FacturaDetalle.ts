import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne} from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";
import { Proveedor } from "./Proveedor";
import { FacturaTipo } from "./FacturaTipo";
import { GrupoDetalle } from "./GrupoDetalle";

@Entity()
export class FacturaDetalle {
    
    sesionId:number;

    @PrimaryGeneratedColumn()
    id: number;

    @Column({type:"varchar" , length:"40"})
    numero:string;

    @Column()
    fechaEmision:Date;

    @Column({type:"numeric", precision:15 , scale:2, transformer: numericTransformer })
    total:number;

    @Column({type:"numeric", precision:15 , scale:2, transformer: numericTransformer })
    impuestos:number;

    @Column({type:"numeric", precision:15 , scale:2, transformer: numericTransformer })
    montoIngresado:number;

    @ManyToOne(type => Proveedor, proveedor => proveedor.facturasDetalle,{eager:true})
    proveedor:Proveedor;

    @ManyToOne(type => FacturaTipo, facturaTipo => facturaTipo.facturasDetalle,{eager:true})
    facturaTipo:FacturaTipo;

    @OneToOne(()=>GrupoDetalle,grupoDetalle => grupoDetalle.facturaDetalle)
    grupoDetalle:GrupoDetalle;

}