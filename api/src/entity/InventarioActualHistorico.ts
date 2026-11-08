import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToOne, Index} from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";
// import { Bodega } from "./Bodega";
import { Movimiento } from "./Movimiento";
// import { Producto } from "./Producto";
import { EstatusEstado } from "./common/NombreEstatus";
import { InventarioDisponible } from "./InventarioActual";


// export enum InventarioDisponible {
//     DISPONIBLE = "disponible",
//     NO_DISPONIBLE = "no-disponible",
//     BAJA = "baja",
//     CUARENTENA = "cuarentena"
// }

@Entity()
export class InventarioActualHistorico {

    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type:"numeric", precision:15 , scale:4, default:0, transformer: numericTransformer })
    cantidad:number;   // Cantidad disponible en stock

    @Column({type:"numeric", precision:15 , scale:4, default:0, transformer: numericTransformer })
    cantidadAlmacen:number;  // Cantidad que fue dada de alta (por compra o alta) en el almacén

    @Column({type:"enum" , enum: EstatusEstado ,  default:EstatusEstado.ACTIVO})
    estatus:EstatusEstado;

    @Column()
    fechaDisponibilidad:Date;

    @Column({type:"enum" , enum: InventarioDisponible ,  default:InventarioDisponible.DISPONIBLE})
    disponible:InventarioDisponible;
    
    @Index()
    @Column({type:"int"})
    idOriginal:number;

    /** Movimiento que produjo la instantánea (estado del inventario ANTES de aplicarlo). Null en las anteriores a la fase 3. */
    @Index()
    @ManyToOne(() => Movimiento, { nullable: true, onDelete: "SET NULL" })
    movimiento:Movimiento | null;

    // @ManyToOne(type => Bodega, bodega => bodega.inventariosActual,{eager:true})
    // bodega:Bodega;

    // @OneToMany(type => Movimiento, movimiento => movimiento.inventarioActual )
    // movimientos:Movimiento[];

    // @OneToOne(() => Producto, producto => producto.inventarioActual,{eager:true})
    // @JoinColumn()
    // producto:Producto;
}