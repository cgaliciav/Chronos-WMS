import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToOne, Index} from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";
import { Bodega } from "./Bodega";
import { Movimiento } from "./Movimiento";
import { Producto } from "./Producto";
import { EstatusEstado } from "./common/NombreEstatus";


import { InventarioDisponible } from "./common/InventarioDisponible";

export { InventarioDisponible };

@Entity()
export class InventarioActual {

    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type:"numeric", precision:15 , scale:4, default:0, transformer: numericTransformer })
    cantidad:number;   // Cantidad disponible en stock

    @Column({type:"numeric", precision:15 , scale:4, default:0, transformer: numericTransformer })
    cantidadAlmacen:number;  // Cantidad que fue dada de alta (por compra o alta) en el almacén

    @Index()
    @Column({type:"enum" , enum: EstatusEstado ,  default:EstatusEstado.ACTIVO})
    estatus:EstatusEstado;

    @Column()
    fechaDisponibilidad:Date;

    @Index()
    @Column({type:"enum" , enum: InventarioDisponible ,  default:InventarioDisponible.DISPONIBLE})
    disponible:InventarioDisponible;

    @ManyToOne(type => Bodega, bodega => bodega.inventariosActual,{eager:true})
    bodega:Bodega;

    @OneToMany(type => Movimiento, movimiento => movimiento.inventarioActual )
    movimientos:Movimiento[];

    @OneToOne(() => Producto, producto => producto.inventarioActual,{eager:true})
    @JoinColumn()
    producto:Producto;
}