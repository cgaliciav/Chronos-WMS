import {Entity, Column, OneToOne,JoinColumn} from "typeorm";
import {NombreEstatus} from './common/NombreEstatus'
import { Producto } from "./Producto";

export enum ValidacionEstado {
  VALIDO = "valido",
  INVALIDO = "invalido",
  NO_REVISADO = "no-revisado",
}

@Entity()
export class ProductoValidado extends NombreEstatus {
  sesionId: number;

  @Column({
    type: "enum",
    enum: ValidacionEstado,
    default: ValidacionEstado.NO_REVISADO,
  })
  validacion: ValidacionEstado;

  @OneToOne(() => Producto, (producto) => producto.productoValidado, {
    eager: true,
  })
  @JoinColumn()
  producto: Producto;
}