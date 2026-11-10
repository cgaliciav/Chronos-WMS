import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";
import { Movimiento } from "./Movimiento";
import { EstatusEstado } from "./common/NombreEstatus";
import { InventarioDisponible } from "./InventarioActual";

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

}