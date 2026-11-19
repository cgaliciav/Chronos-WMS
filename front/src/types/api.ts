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

/**
 * Qué artículos ve y opera un usuario (decisión 21): `general` todos; `produccion` los comprados por sus proyectos o
 * cuyo último movimiento es de ellos; `usuario` aquellos en cuyos movimientos es responsable o quien registró.
 */
export type ModoVisibilidad = 'general' | 'produccion' | 'usuario'
export const OPCIONES_MODO_VISIBILIDAD: { value: ModoVisibilidad; label: string }[] = [
  { value: 'general', label: 'General: todos los artículos' },
  { value: 'produccion', label: 'Producción exclusiva: solo los de sus proyectos' },
  { value: 'usuario', label: 'Usuario exclusivo: solo los de sus movimientos' },
]

/**
 * Perfil del usuario (decisión 22): de él salen todos sus permisos (los traduce el API). `personalizado` es de usuarios
 * anteriores a los perfiles (conservan sus roles sueltos) y `sin-acceso` de los usuarios sin correo (decisión 23).
 */
export type Perfil =
  | 'superadministrador'
  | 'administrador'
  | 'encargado-produccion'
  | 'visita'
  | 'sin-acceso'
  | 'personalizado'
export const ETIQUETA_PERFIL: Record<Perfil, string> = {
  superadministrador: 'Superadministrador',
  administrador: 'Administrador',
  'encargado-produccion': 'Encargado de Producción',
  visita: 'Visita',
  'sin-acceso': 'Sin correo (sin acceso)',
  personalizado: 'Personalizado (roles anteriores)',
}
/** Perfiles que se eligen en el formulario, con lo que permite cada uno. */
export const OPCIONES_PERFIL: { value: Perfil; label: string; descripcion: string }[] = [
  { value: 'superadministrador', label: 'Superadministrador', descripcion: 'Puede hacer todo en el sistema' },
  { value: 'administrador', label: 'Administrador', descripcion: 'Todo, excepto la Configuración' },
  {
    value: 'encargado-produccion',
    label: 'Encargado de Producción',
    descripcion:
      'Búsqueda por proyecto, compras y listados por proyecto de préstamos, devoluciones y bajas (sin registrarlos)',
  },
  { value: 'visita', label: 'Visita', descripcion: 'Solo ve el listado de préstamos activos' },
]

export interface Usuario {
  id: number
  nombre: string
  correo: string
  estatus: Estatus
  vencimiento?: string
  perfil?: Perfil
  modoVisibilidad?: ModoVisibilidad
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
  /** Solo con contraseña temporal: hay que cambiarla antes de usar el sistema (API v2.83.5, hallazgo L2). */
  cambiarPassword?: boolean
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
/** Ids fijos de `producto_tipo`. El CONSUMIBLE es el "expendable": al prestarlo se da por consumido (decisión 18). */
export const PRODUCTO_TIPO = { REGULAR: 1, CONSUMIBLE: 2 } as const
export const OPCIONES_PRODUCTO_TIPO = [
  { value: PRODUCTO_TIPO.REGULAR, label: 'Regular' },
  { value: PRODUCTO_TIPO.CONSUMIBLE, label: 'Expendable' },
]
export type MovimientoTipo = NombreEstatus
/** Ids fijos de `movimiento_tipo` que el front necesita por nombre (el resto llega del API). */
export const MOVIMIENTO_TIPO = { TRANSFORMACION: 18, ALTA_POR_TRANSFORMACION: 19 } as const

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
  /** Unidades aún sin devolver de una salida; `null` en movimientos anteriores a la fase 3 o sin saldo. */
  saldoPendiente?: Numerico | null
  /** El producto era expendable al registrar el movimiento: no deja pendiente de devolución (plan 04). */
  consumible?: boolean
}

/** Respuesta de `PUT /groups/activity-transform`: el movimiento del original y los de los productos creados. */
export interface ResultadoTransformacion {
  origen: Movimiento
  derivados: Movimiento[]
}

/** Un artículo relacionado por una transformación (`GET /activity/transformations-by-inventory/:id`). */
export interface TransformacionArticulo {
  id: number
  fecha: string
  /** Unidades del producto creado. */
  cantidad: number
  /** Unidades del artículo original que se usaron. */
  cantidadOriginal: number
  inventarioActualId: number
  titulo: string
  codigo: string | null
  proyecto: string | null
}

export interface TransformacionesArticulo {
  /** Artículos de los que salió este producto. */
  origenes: TransformacionArticulo[]
  /** Productos creados a partir de este artículo. */
  derivados: TransformacionArticulo[]
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
  /** La contraseña usada es temporal: el token solo sirve para cambiarla (`PUT /user/password`). */
  cambiarPassword?: boolean
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
  mensaje?: string | null
  /** `reporte` (Excel listo o fallido), `prestamo` (vencido) o `sistema`. */
  tipo?: 'reporte' | 'prestamo' | 'sistema'
  fecha: string
  leida: boolean
  fechaLectura?: string | null
  /**
   * Adónde lleva: una ruta del front (`/prestamos/operacion?uid=3`) o un recurso del API que empieza por `/file/`
   * (`/file/report/x.xlsx`), que se abre con el token (`urlNotificacion`).
   */
  url?: string | null
}
