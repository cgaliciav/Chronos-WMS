/**
 * Tipos locales de los catálogos (`pages/catalogos`). Amplían los de `types/api.ts` con los campos que leen estas
 * páginas y que aún no recoge ese archivo (`fechaDisponibilidad`, `productoValidado`, `productoInventarios`).
 */
import type { Dayjs } from 'dayjs'
import type {
  Area,
  Bodega,
  Disponibilidad,
  InventarioActual,
  Numerico,
  PaginacionAntd,
  ParametrosTabla,
  Producto,
} from 'types/api'

/** Identificador de un elemento de catálogo en un `Select`. */
export type Id = number | string

/** Paginación de los resultados de catálogo (`total` falta mientras no ha respondido el API). */
export interface PaginacionCatalogo extends Partial<PaginacionAntd> {
  current: number
  pageSize: number
}

/** Cuerpo de las peticiones `list-catalog-*` de `/current-inventory`. */
export interface ParametrosCatalogo extends ParametrosTabla {
  pagination?: PaginacionCatalogo
  textoBusqueda?: string | null
  areasIds?: Id[] | null
  bodegaIds?: Id[] | null
  estados?: string[] | null
  proyectoId?: Id | Id[] | null
  movimientosTipoIds?: Id | Id[] | null
  codigosBusqueda?: string
  con_foto?: boolean
}

/** Propiedades comunes de los formularios de búsqueda de catálogo. */
export interface FormaBusquedaProps<T> {
  handleFinish: (valores: T) => void
  cargando: boolean
}

/** Búsqueda por texto, áreas, almacenes y estado (general, bajas, validaciones, inventario visual). */
export interface BusquedaGeneral {
  textoBusqueda?: string | null
  areas: Id[] | null
  bodegas: Id[] | null
  estado: string[] | null
}

/** Búsqueda por códigos (uno por línea). */
export interface BusquedaPorCodigos {
  codigosBusqueda?: string
}

/**
 * Búsqueda por proyecto (y por facturas). `proyecto` y `tipoMovimiento` son `Select` simples, pero el estado
 * inicial heredado los guarda como `[]`.
 */
export interface BusquedaPorProyecto {
  textoBusqueda?: string | null
  areas?: Id[] | null
  bodegas?: Id[] | null
  proyecto?: Id | Id[] | null
  tipoMovimiento?: Id | Id[] | null
}

/** Validación de producto (`/item-review`): `valido`, `invalido` o `no-revisado`. */
export interface ValidacionProducto {
  id?: number
  validacion?: string | null
}

/** Resultado de inventario de un producto (`/item-balance`). */
export interface InventarioProducto {
  id?: number
  fecha?: string | Date
  /** `inventarioPositivo`, `inventarioNegativo`, `no-revisado` o, calculado en el front, `inventarioViejo`. */
  validacion?: string
  invalido?: boolean
  nombre?: string
}

/** Producto tal como lo devuelven los catálogos y `GET /current-inventory/:id`. */
export interface ProductoCatalogo extends Producto {
  productoValidado?: ValidacionProducto | null
  productoInventarios?: InventarioProducto[] | null
}

/** Elemento de los resultados de catálogo (`list-catalog-*`). */
export interface InventarioCatalogo extends Omit<InventarioActual, 'producto'> {
  /** Fin de la cuarentena. */
  fechaDisponibilidad?: string
  producto?: ProductoCatalogo
}

/** Producto de las páginas de detalle: el marcador inicial («------») o la respuesta del API. */
export interface ProductoDetalle extends Omit<ProductoCatalogo, 'area'> {
  area?: Pick<Area, 'id' | 'nombre'>
}

/**
 * Estado de las páginas de detalle y edición de artículo: el marcador inicial o la respuesta de
 * `GET /current-inventory/:id`, que puede llegar sin relaciones (hallazgo F36).
 */
export interface InventarioDetalle {
  id?: number
  cantidad: Numerico
  cantidadAlmacen?: Numerico
  disponible: Disponibilidad | 'no definido'
  fechaDisponibilidad?: string | Dayjs
  bodega?: Pick<Bodega, 'id' | 'nombre'>
  producto?: ProductoDetalle
}

/** Marcador que muestran las páginas de detalle mientras carga el artículo. */
export const inventarioDetalleInicial = (): InventarioDetalle => ({
  cantidad: 0,
  disponible: 'no definido',
  bodega: { id: 0, nombre: '------' },
  producto: {
    archivos: [],
    productoPrecios: [],
    productoCaracteristicas: [],
    productoClaves: [],
    productoInventarios: [],
    area: { id: 0, nombre: '-----' },
    id: 0,
    descripcion: '----------------',
    titulo: '------',
  },
})
