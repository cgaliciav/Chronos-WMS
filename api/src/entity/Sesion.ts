import {Entity, ManyToOne, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn} from "typeorm";
import { Usuario } from './Usuario'
import { LogFuncionamiento } from './LogFuncionamiento'
import { Movimiento } from "./Movimiento";
import { Comentario } from "./Comentario";
import { Grupo } from "./Grupo";
import { ProductoInventariado } from "./ProductoInventariado";
// import { Factura } from "./FacturaDetalle";
// import { Previodata } from "./Previodata";
// import { Previo } from "./Previo";


@Entity()
export class Sesion{
    
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    fechaInicio:Date;

    @Column({nullable:true})
    fechaFin:Date;

    @Column({ type:"varchar", length:50 })
    IP:string;

    @ManyToOne(type => Usuario, usuario => usuario.sesiones,{eager:true} )
    usuario:Usuario;

    @OneToMany(type => LogFuncionamiento, logFuncionamiento => logFuncionamiento.sesion)
    logsFuncionamiento:LogFuncionamiento[];

    @OneToMany(type => Movimiento, movimiento => movimiento.sesion)
    movimientos:Movimiento[];

    @OneToMany(type => Comentario, comentario => comentario.sesion)
    comentarios:Comentario[];

    @OneToMany(type => Grupo, grupo => grupo.sesion)
    grupos:Grupo[];

    @OneToMany(type => ProductoInventariado, productoInventariado => productoInventariado.sesion)
    productoInventarios:ProductoInventariado[];


}
