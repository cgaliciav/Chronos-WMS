import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne, ManyToMany, OneToMany, CreateDateColumn} from "typeorm";
import { numericTransformer } from "../helpers/numericTransformer";

import { InventarioActual } from "./InventarioActual";
import { Sesion } from "./Sesion";
import { EstatusEstado } from "./common/NombreEstatus";
import { Operacion } from "./Operacion";
import { Grupo } from "./Grupo";
import { MovimientoRelacion } from "./MovimientoRelacion";

@Entity()
export class Movimiento {

    sesionId:number;

    @PrimaryGeneratedColumn()
    id: number;

    @Column({type:"numeric", precision:15 , scale:4, transformer: numericTransformer })
    cantidad:number;

    /**
     * @deprecated `activo` marca el último movimiento con operación de cada inventario. Se mantiene porque lo
     * lee el front, pero la relación entre movimientos vive en `MovimientoRelacion` (plan 02 regla 7).
     */
    @Column({type:"enum" , enum: EstatusEstado ,  default:EstatusEstado.ACTIVO})
    estatus:EstatusEstado;

    /** Fecha de creación del movimiento. Para los anteriores a la fase 3 se rellenó con la de su operación o grupo. */
    @CreateDateColumn()
    fecha:Date;

    /**
     * true para los movimientos anteriores a la fase 3 (sin relaciones, decisión "sin backfill"). Sus salidas no
     * cuentan en `v_movimiento_saldo`; las devoluciones contra ellas usan el modo de compatibilidad (regla 8).
     */
    @Column({ default: false })
    legado:boolean;

    @ManyToOne(type => Sesion, sesion => sesion.movimientos,{eager:true})
    sesion:Sesion;

    @ManyToOne(type => InventarioActual, inventarioActual => inventarioActual.movimientos,{eager:true})
    inventarioActual:InventarioActual;

    @OneToOne(() => Operacion, operacion => operacion.movimiento)
    @JoinColumn()
    operacion:Operacion;

    // NO ACTION explícito: es la FK que creó TypeORM 0.2 (producción). TypeORM 1.x usaría CASCADE por defecto en el
    // lado inverso, y borrar un movimiento lo quitaría de sus listados en silencio (plan 02 · fase 6).
    @ManyToMany(()=>Grupo, grupo=> grupo.movimientos, { onDelete: "NO ACTION", onUpdate: "NO ACTION" })
    grupos:Grupo[];

    /** Relaciones en las que este movimiento es la salida (origen). */
    @OneToMany(() => MovimientoRelacion, (r) => r.origen)
    relacionesComoOrigen:MovimientoRelacion[];

    /** Relaciones en las que este movimiento es el regreso o baja (derivado). */
    @OneToMany(() => MovimientoRelacion, (r) => r.derivado)
    relacionesComoDerivado:MovimientoRelacion[];

}