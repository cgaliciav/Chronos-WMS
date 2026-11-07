import {Entity, OneToMany,} from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Operacion } from "./Operacion";
import { GrupoDetalle } from "./GrupoDetalle";


@Entity()
export class MovimientoTipo extends NombreEstatus{
    
    sesionId:number;

    @OneToMany(type => Operacion, operacion => operacion.movimientoTipo)
    operaciones:Operacion[];

    @OneToMany(type => GrupoDetalle, grupoDetalle => grupoDetalle.movimientoTipo)
    gruposDetalle:GrupoDetalle[];



}
