/**
 * Tipos locales de las páginas de administración (usuarios, proyectos, proveedores, áreas y almacenes).
 * Extienden los de `types/api.ts` con los campos que estas pantallas leen y que ese archivo aún no recoge.
 */
import type { MouseEvent } from 'react'
import type { Dayjs } from 'dayjs'
import type {
  Area,
  Bodega,
  ParametrosTabla,
  Proveedor,
  Proyecto,
  ResultadoTabla,
  Usuario,
} from 'types/api'

/** Proyecto tal como lo devuelven `GET /project/:id` y `list-antd`. */
export interface ProyectoAdmin extends Proyecto {
  descripcion?: string
  productor?: string
  fechaInicio?: string
}

/** Proveedor tal como lo devuelven `GET /supplier/:id` y `list-antd`. */
export interface ProveedorAdmin extends Proveedor {
  RFCEmite?: string
}

/** Almacén tal como lo devuelven `GET /warehouse/:id` y `list-antd`. */
export interface BodegaAdmin extends Bodega {
  descripcion?: string
}

/** Estatus calculado por `POST /user/list-antd` (tiene en cuenta el vencimiento). */
export type EstatusExtendido = 'activo' | 'inactivo' | 'vencido'

/** Fila del listado de usuarios. */
export interface UsuarioListado extends Usuario {
  estatusExtendido?: EstatusExtendido
}

/** Estado local de las pantallas de edición: la entidad sin `id` (llega por la URL, `?uid=`). */
export type EstadoEdicion<T extends { id: number }> = Omit<T, 'id'>

/** Estado de `usuarios/editar`: `vencimiento` empieza como `Date` hasta que llega el del API. */
export type EstadoUsuarioEditar = Omit<EstadoEdicion<Usuario>, 'vencimiento'> & {
  vencimiento?: string | Date
}

/** Estado de `proyectos/editar`: `fechaInicio` empieza como `Date` hasta que llega la del API. */
export type EstadoProyectoEditar = Omit<EstadoEdicion<ProyectoAdmin>, 'fechaInicio'> & {
  fechaInicio?: string | Date
}

export type EstadoAreaEditar = EstadoEdicion<Area>
export type EstadoBodegaEditar = EstadoEdicion<BodegaAdmin>
export type EstadoProveedorEditar = EstadoEdicion<ProveedorAdmin>

/** Id de la URL (`?uid=`): `0` mientras no se ha leído. */
export type IdUrl = number | string

/** Manejador de los botones Habilitar/Deshabilitar de las pantallas de edición. */
export type ManejadorBoton = (evento: MouseEvent<HTMLElement>) => void

/** Props comunes de las formas (`componentes/forma.tsx`) de las cinco entidades. */
export interface PropsForma<V> {
  handleFinish: (valores: V) => void | Promise<void>
  guardando: boolean
  habilitado: boolean
  valoresIniciales?: Partial<V>
  valores?: Partial<V>
}

export interface ValoresFormaArea {
  nombre: string
}

export interface ValoresFormaBodega {
  nombre: string
  descripcion: string
}

export interface ValoresFormaProveedor {
  nombre: string
  rfc?: string
}

export type TipoProyecto = 'interno' | 'externo'

export interface ValoresFormaProyecto {
  nombre: string
  productor: string
  fecha: Dayjs
  descripcion: string
  tipoProyecto: TipoProyecto
}

export interface ValoresFormaUsuario {
  nombre: string
  correo: string
  fechaVencimiento: Dayjs
  roles: number[]
  areas: number[]
  bodegas: number[]
  proyectosInternos?: number[]
  proyectosExternos?: number[]
}

export interface ValoresCambiarPassword {
  passwordAnterior: string
  passwordNuevo: string
  passwordNuevoConfirmacion: string
}

/** Método `listado` de un servicio (`services/axios/<recurso>`), que alimenta `TablaGeneral`. */
export type PeticionListado<T> = (parametros: ParametrosTabla) => Promise<ResultadoTabla<T>>
