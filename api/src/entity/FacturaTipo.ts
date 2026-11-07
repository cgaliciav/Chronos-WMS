import {Entity, OneToMany,} from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { FacturaDetalle } from "./FacturaDetalle";


@Entity()
export class FacturaTipo extends NombreEstatus{

    sesionId:number;

    @OneToMany(type=>FacturaDetalle, factura => factura.facturaTipo)
    facturasDetalle:FacturaDetalle[];


}


