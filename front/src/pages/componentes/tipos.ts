/**
 * Tipos locales de los componentes compartidos (`pages/componentes`) y de los reportes (`pages/reportes`). Amplían
 * los de `types/api.ts` con los campos que estos componentes leen y que aún no recoge ese archivo.
 */
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import type {
  Archivo,
  Grupo,
  InventarioActual,
  Movimiento,
  Operacion,
  Producto,
  ProductoClave,
  Usuario,
} from 'types/api'

/** Solo se necesita el `id` para pedir las fichas o construir la URL de un archivo. */
export type ArchivoId = Pick<Archivo, 'id'>

/** Clave de producto tal como la lista `GET /item/:id` (con `barrasTipo`: «Manual», «Autogenerada»…). */
export interface ProductoClaveFila extends ProductoClave {
  barrasTipo?: string
}

/** Sesión del usuario que registró un movimiento o un inventario. */
export interface SesionRegistro {
  usuario: Pick<Usuario, 'id' | 'nombre'>
}

/** Movimiento de `GET /activity/history-by-current-inventory/:id` (con operación, grupos y sesión cargados). */
export interface MovimientoHistorial extends Omit<Movimiento, 'operacion' | 'grupos'> {
  operacion: Operacion & { usuarios: Usuario[] }
  grupos: Grupo[]
  sesion: SesionRegistro
}

/** Resultado de un inventario de producto (`/item-balance`). */
export type ValidacionInventario =
  'inventarioPositivo' | 'inventarioNegativo' | 'no-revisado' | 'inventarioViejo'

/** Registro de `GET /item-balance/:productoId` (historial de inventarios del producto). */
export interface ProductoInventariadoRegistro {
  id: number
  fecha: string
  validacion: ValidacionInventario
  /** `"<origen>>>><detalle>"`: se muestra la parte anterior a `>>>` (manual u operación). */
  nombre: string
  invalido?: boolean
  sesion?: Partial<SesionRegistro>
}

/** Validación de producto (`/item-review`). */
export interface ProductoValidadoRegistro {
  id?: number
  validacion?: string
}

/** Producto con lo que muestra la ficha de artículo (`articulo.tsx`). */
export interface ProductoArticulo extends Producto {
  productoValidado?: ProductoValidadoRegistro | null
  productoInventarios?: ProductoInventariadoRegistro[] | null
}

/** Inventario actual con lo que muestra la ficha de artículo (`articulo.tsx`). */
export interface InventarioArticulo extends InventarioActual {
  /** Fin de la cuarentena. */
  fechaDisponibilidad?: string
}

/** Valor de un `Select` con `labelInValue`. */
export interface OpcionEtiquetada {
  value: number
  label?: ReactNode
  key?: string
}

/** Evento con el que antd `Modal` llama a `onCancel` (clic en la X o en «Cancelar», o tecla Escape). */
export type EventoCerrarModal = MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement>
