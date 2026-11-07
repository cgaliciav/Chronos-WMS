// Lista explícita de entidades y suscriptores. Úsala en lugar de globs cuando el entorno
// (p. ej. Jest) pueda cargar dos copias del mismo módulo.
import { Archivo } from "./Archivo";
import { Area } from "./Area";
import { Bodega } from "./Bodega";
import { Comentario } from "./Comentario";
import { FacturaDetalle } from "./FacturaDetalle";
import { FacturaTipo } from "./FacturaTipo";
import { Grupo } from "./Grupo";
import { GrupoDetalle } from "./GrupoDetalle";
import { InventarioActual } from "./InventarioActual";
import { InventarioActualHistorico } from "./InventarioAcutalHistorico";
import { InventarioDetalle } from "./InventarioDetalle";
import { LogFuncionamiento } from "./LogFuncionamiento";
import { LogGeneral } from "./LogGeneral";
import { LogPeticiones } from "./LogPeticiones";
import { Movimiento } from "./Movimiento";
import { MovimientoTipo } from "./MovimientoTipo";
import { Operacion } from "./Operacion";
import { OperacionDetalle } from "./OperacionDetalle";
import { OperacionPrecio } from "./OperacionPrecio";
import { Parametros } from "./Parametros";
import { PrecioTipo } from "./PrecioTipo";
import { Producto } from "./Producto";
import { ProductoCaracteristica } from "./ProductoCaracteristica";
import { ProductoClave } from "./ProductoClave";
import { ProductoInventariado } from "./ProductoInventariado";
import { ProductoPrecio } from "./ProductoPrecio";
import { ProductoTipo } from "./ProductoTipo";
import { ProductoValidado } from "./ProductoValidado";
import { Proveedor } from "./Proveedor";
import { Proyecto } from "./Proyecto";
import { Rol } from "./Rol";
import { Sesion } from "./Sesion";
import { Usuario } from "./Usuario";
import { GeneralSubscriber } from "../subscriber/suscriberLog";

export const ENTIDADES = [
  Archivo, Area, Bodega, Comentario, FacturaDetalle, FacturaTipo, Grupo, GrupoDetalle,
  InventarioActual, InventarioActualHistorico, InventarioDetalle, LogFuncionamiento, LogGeneral,
  LogPeticiones, Movimiento, MovimientoTipo, Operacion, OperacionDetalle, OperacionPrecio, Parametros,
  PrecioTipo, Producto, ProductoCaracteristica, ProductoClave, ProductoInventariado, ProductoPrecio,
  ProductoTipo, ProductoValidado, Proveedor, Proyecto, Rol, Sesion, Usuario,
];

export const SUSCRIPTORES = [GeneralSubscriber];
