/**
 * Tipos de las respuestas del API (`api/src/entity/*.ts`, `docs/api/modelo-de-datos.md`).
 * Las relaciones son opcionales porque cada endpoint carga solo algunas. Los campos marcados como «plan 02»
 * llegan cuando el API despliegue esas fases; mientras tanto vienen indefinidos.
 */

/**
 * Columnas `numeric` (cantidades, precios, totales). Antes de la fase 2 del plan 02 el driver las devolvía como
 * `string`; desde entonces llegan como `number`. Convierte con `Number()` antes de operar.
 */
export type Numerico = number | string

export type Estatus = 'activo' | 'inactivo' | 'finalizado' | 'eliminado'

/** Base de los catálogos (`NombreEstatus` en el API). */
export interface NombreEstatus {
  id: number
  nombre: string
  estatus: Estatus
}

export interface Comentario {
  id: number
  comentario: string
  fecha?: string
  sesion?: { usuario?: Pick<Usuario, 'id' | 'nombre'> }
}

export interface Archivo {
  id: number
  nombre: string
  tipo?: string
  tamano?: number
}

export interface Rol extends NombreEstatus {
  codigoRol: string
}

export interface Usuario {
  id: number
  nombre: string
  correo: string
  estatus: Estatus
  vencimiento?: string
  roles?: Rol[]
  areas?: Area[]
  bodegas?: Bodega[]
  proyectos?: Proyecto[]
  comentarios?: Comentario[]
}

/** `GET /user/current`: el usuario de la sesión con `roles` reducidos a sus códigos. */
export interface UsuarioActual extends Omit<Usuario, 'roles'> {
  roles: string[]
  avatar?: string
}

export type Area = NombreEstatus
export interface Bodega extends NombreEstatus {
  cobacha?: boolean
}
export interface Proyecto extends NombreEstatus {
  esExterno?: boolean
}
export type Proveedor = NombreEstatus
export type FacturaTipo = NombreEstatus
export type PrecioTipo = NombreEstatus
export type ProductoTipo = NombreEstatus
export type MovimientoTipo = NombreEstatus

export interface ProductoClave {
  id: number
  barras: string
  tipo?: string
}

export interface ProductoPrecio {
  id: number
  precio: Numerico
  moneda?: string
  precioTipo: PrecioTipo
}

export interface ProductoCaracteristica {
  id: number
  llave: string
  valor: string
}

export interface Producto {
  id: number
  titulo: string
  descripcion?: string
  area?: Area
  productoTipo?: ProductoTipo
  productoClaves?: ProductoClave[]
  productoPrecios?: ProductoPrecio[]
  productoCaracteristicas?: ProductoCaracteristica[]
  comentarios?: Comentario[]
  archivos?: Archivo[]
}

export type Disponibilidad = 'disponible' | 'no-disponible' | 'baja' | 'cuarentena'

export interface InventarioActual {
  id: number
  /** Cantidad disponible ahora. */
  cantidad: Numerico
  /** Cantidad dada de alta. */
  cantidadAlmacen: Numerico
  disponible: Disponibilidad
  producto?: Producto
  bodega?: Bodega
}

export interface Operacion {
  id: number
  fecha?: string
  movimientoTipo: MovimientoTipo
  proyecto?: Proyecto
  usuarios?: Usuario[]
  comentarios?: Comentario[]
  archivos?: Archivo[]
}

/** Relación origen → derivado entre movimientos (plan 02, fase 3). */
export interface RelacionMovimiento {
  movimientoOrigenId: number
  movimientoDerivadoId: number
  cantidad: Numerico
}

export interface Movimiento {
  id: number
  cantidad: Numerico
  estatus: Estatus
  inventarioActual?: InventarioActual
  operacion?: Operacion
  grupos?: Grupo[]
  /** Plan 02, fase 3. */
  fecha?: string
  relacionesOrigen?: RelacionMovimiento[]
  relacionesDerivadas?: RelacionMovimiento[]
  saldoPendiente?: Numerico
}

export interface GrupoDetalle {
  id: number
  movimientoTipo: MovimientoTipo
  proyecto?: Proyecto
  usuarios: Usuario[]
}

export interface Grupo extends NombreEstatus {
  grupoDetalle?: GrupoDetalle
  movimientos?: Movimiento[]
  comentarios?: Comentario[]
  archivos?: Archivo[]
}

/** Paginación de antd (`Table`) tal como la devuelve el contrato `list-antd`. */
export interface PaginacionAntd {
  current: number
  pageSize: number
  total: number
  totalItems?: number
}

/** Respuesta de los endpoints `*-antd` / `list-antd`. */
export interface ResultadoTabla<T> {
  results: T[]
  pagination: PaginacionAntd
  filtered?: number
}

/** Parámetros que envían las tablas server-side. */
export interface ParametrosTabla {
  sortField?: string
  sortOrder?: 'ascend' | 'descend' | null
  pagination?: Partial<PaginacionAntd>
  filters?: Record<string, unknown>
  [otro: string]: unknown
}

/** `POST /auth/login`. */
export interface RespuestaLogin {
  t: string
}

/** `GET /auth/version`. */
export interface VersionApi {
  version: string
}

/** Respuesta genérica con mensaje (altas, bajas, cambios de estatus). */
export interface RespuestaMensaje {
  message?: string
  [otro: string]: unknown
}

/** Notificación del sistema propio (plan 02, fase 7: `GET /notifications`, `PUT /notifications/:id/read`). */
export interface Notificacion {
  id: number
  titulo: string
  mensaje?: string
  fecha: string
  leida: boolean
  /** Ruta del front a la que lleva la notificación (p. ej. `/prestamos/operacion?uid=3`). */
  url?: string
}
