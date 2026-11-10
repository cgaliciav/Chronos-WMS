import {
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    OneToMany, 
    Index,
    ManyToMany, 
    JoinTable, 
    ManyToOne, 
    OneToOne} from "typeorm";

import { Area } from "./Area";
import { ProductoTipo } from "./ProductoTipo";
import { Archivo } from "./Archivo";

import { ProductoCaracteristica } from "./ProductoCaracteristica";
import { ProductoClave } from "./ProductoClave";
import { Comentario } from "./Comentario";
import { ProductoPrecio } from "./ProductoPrecio";

import { InventarioActual } from "./InventarioActual";
import { ProductoValidado } from "./ProductoValidado";
import { ProductoInventariado } from "./ProductoInventariado";

@Entity()
export class Producto {
  sesionId: number;

  @PrimaryGeneratedColumn()
  id: number;

  @Index({ fulltext: true })
  @Column({ type: "varchar", length: 255 })
  titulo: string;

  @Index({ fulltext: true })
  @Column({ type: "text" })
  descripcion: string;

  @ManyToOne((type) => Area, (area) => area.productos, { eager: true })
  area: Area;

  @ManyToOne((type) => ProductoTipo, (productoTipo) => productoTipo.productos, {
    eager: true,
  })
  productoTipo: ProductoTipo;

  @OneToMany(
    (type) => ProductoCaracteristica,
    (productoCaracteristica) => productoCaracteristica.producto,
    { eager: true }
  )
  productoCaracteristicas: ProductoCaracteristica[];

  @OneToMany(
    (type) => ProductoClave,
    (productoClave) => productoClave.producto,
    { eager: true }
  )
  productoClaves: ProductoClave[];

  @OneToMany(
    (type) => ProductoPrecio,
    (productoPrecio) => productoPrecio.producto,
    { eager: true }
  )
  productoPrecios: ProductoPrecio[];

  @ManyToMany((type) => Comentario)
  @JoinTable()
  comentarios: Comentario[];

  @ManyToMany((type) => Archivo)
  @JoinTable()
  archivos: Archivo[];

  @OneToOne(
    () => InventarioActual,
    (inventarioActual) => inventarioActual.producto
  )
  inventarioActual: InventarioActual;

  @OneToOne(
    () => ProductoValidado,
    (productoValidado) => productoValidado.producto
  )
  productoValidado: ProductoValidado;

  @OneToMany(
    (type) => ProductoInventariado,
    (productoInventariado) => productoInventariado.producto,
    { eager: true }
  )
  productoInventarios: ProductoInventariado[];
}
