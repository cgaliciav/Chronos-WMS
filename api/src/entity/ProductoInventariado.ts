import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import { NombreEstatus } from "./common/NombreEstatus";
import { Producto } from "./Producto";
import { Sesion } from "./Sesion";

export enum InventarioEstado {
  INVENTARIO_POSITIVO = "inventarioPositivo",
  INVENTARIO_NEGATIVO = "inventarioNegativo",
  NO_REVISADO = "no-revisado",
}

@Entity()
export class ProductoInventariado extends NombreEstatus {
  sesionId: number;

  @Column({
    type: "enum",
    enum: InventarioEstado,
    default: InventarioEstado.NO_REVISADO,
  })
  validacion: InventarioEstado;

  @ManyToOne(type => Producto, producto => producto.productoInventarios)
    producto : Producto;

  @CreateDateColumn()
    fecha: Date;

  @ManyToOne(type => Sesion, sesion => sesion.productoInventarios,{eager:true})
    sesion:Sesion;
}
