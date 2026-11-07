import { CreateDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Archivo } from "./Archivo";
import { Comentario } from "./Comentario";
import { Movimiento } from "./Movimiento";
import { MovimientoTipo } from "./MovimientoTipo";
import { OperacionDetalle } from "./OperacionDetalle";
import { OperacionPrecio } from "./OperacionPrecio";
import { Proyecto } from "./Proyecto";
import { Usuario } from "./Usuario";



@Entity()
export class Operacion {
    sesionId:number;

    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    fecha:Date;

    @Index()
    @ManyToOne(type => MovimientoTipo, movimientoTipo => movimientoTipo.operaciones,{eager:true})
    movimientoTipo:MovimientoTipo;

    @ManyToOne(type => Proyecto, proyecto => proyecto.operaciones,{eager:true})
    proyecto:Proyecto;

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];

    @ManyToMany(type => Archivo)
    @JoinTable()
    archivos:Archivo[];

    @ManyToMany(type => Usuario)
    @JoinTable()
    usuarios:Usuario[];

    @OneToOne(() => OperacionDetalle)
    @JoinColumn()
    operacionDetalle:OperacionDetalle;  // SE OCUPA EN CASO DE COMPRA

    @OneToMany(type => OperacionPrecio, operacionPrecio => operacionPrecio.operacion)
    operacionPrecios:OperacionPrecio[]; // PARA OPERACIONES: RENTA, PRESTAMO, DEVOLUCION?,TRANSFERENCIA, INVENTARIOS?

    @OneToOne(()=> Movimiento, movimiento => movimiento.operacion)
    movimiento:Movimiento;


}