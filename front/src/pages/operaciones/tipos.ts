/**
 * Tipos comunes de las operaciones (préstamos, devoluciones, bajas, compras, altas, rentas externas, inventario y
 * previo) y de sus componentes compartidos (`operaciones/componentes`). Extienden los de `types/api.ts`.
 */
import type { Key, ReactNode } from 'react'
import type { TableColumnType, TableColumnsType } from 'antd'
import type { Dayjs } from 'dayjs'
import type { Grupo, Movimiento, ParametrosTabla, ResultadoTabla, Usuario } from 'types/api'
import type { InventarioArticulo, ProductoArticulo } from 'pages/componentes/tipos'

/* ------------------------------------------------------------------------------------------------------------
 * Datos
 * ---------------------------------------------------------------------------------------------------------- */

/** Producto tal como llega en los movimientos de las operaciones (con los datos de validación e inventario). */
export type ProductoOperacion = ProductoArticulo

/** Inventario actual de un movimiento de operación (`fechaDisponibilidad` llega en algunos endpoints). */
export interface InventarioActualOperacion extends Omit<InventarioArticulo, 'producto'> {
  producto?: ProductoOperacion
}

/**
 * Movimiento de los listados de operaciones (`activity-list-by-group`, `list-by-project-antd`,
 * `active-activity-list`): incluye la sesión del almacenista que lo registró.
 */
export interface MovimientoOperacion extends Omit<Movimiento, 'inventarioActual'> {
  inventarioActual?: InventarioActualOperacion
  sesion?: { usuario?: Pick<Usuario, 'id' | 'nombre'> }
}

/** Petición de una tabla server-side (`PeticionBase.listado` o equivalentes de `services/axios/grupos`). */
export type PeticionTabla<T = unknown> = (parametros: ParametrosTabla) => Promise<ResultadoTabla<T>>

/** Paginación local de las tablas (antes de la primera respuesta solo hay `current` y `pageSize`). */
export interface PaginacionTabla {
  current: number
  pageSize: number
  total?: number
  totalItems?: number
}

/** Valor de un `Select` con `labelInValue` (usuarios responsables, proveedor). */
export interface ValorEtiquetado {
  key?: Key
  value?: Key
  label?: ReactNode
}

/* ------------------------------------------------------------------------------------------------------------
 * Columnas (`componentes/columnasTablaOperaciones`)
 * ---------------------------------------------------------------------------------------------------------- */

export type ColumnaOperacion = TableColumnType<MovimientoOperacion>
export type ColumnasOperacion = TableColumnsType<MovimientoOperacion>
/** Quita un movimiento del grupo (columna `funciones`). */
export type FnQuitarMovimiento = (movimientoId: number) => unknown

/* ------------------------------------------------------------------------------------------------------------
 * Tablas
 * ---------------------------------------------------------------------------------------------------------- */

/** `componentes/tablaOperaciones`: movimientos de un grupo con el último artículo agregado. */
export interface TablaOperacionesProps {
  titulo?: ReactNode
  columns: ColumnasOperacion
  /** Normalmente `GrupoPeticiones.movimientosPorGrupo`; recibe además `grupoId`. */
  fnPeticion: PeticionTabla<MovimientoOperacion>
  /** No pide nada mientras valga `0`. */
  grupoId: number | string
  /** Cada cambio vuelve a pedir la tabla. */
  conteoRefresh?: number
  /** Nombre del reporte; si falta se usa un número aleatorio. */
  grupoNombre?: string
  movimientoTipoNombre?: string
  /** Lo pasan algunas operaciones; la tabla no lo usa (su spinner es propio). */
  cargando?: boolean
}

/** `componentes/tablaListados`: grupos (listados) de un tipo de movimiento. */
export interface TablaListadosProps {
  titulo?: ReactNode
  columns: TableColumnsType<Grupo>
  /** Normalmente `GrupoPeticiones.listadoPorGrupo`; recibe además `movimientoTipoId`. */
  fnPeticion: PeticionTabla<Grupo>
  movimientoTipoId?: number | number[]
  conteoRefresh?: number
}

/** `componentes/tablaListadosPorProyecto`: movimientos por proyecto, usuarios, áreas y almacenes. */
export interface TablaListadosPorProyectoProps {
  titulo?: ReactNode
  columns: ColumnasOperacion
  /**
   * `GrupoPeticiones.listadoPorProyecto` o `movimientosActivosProyecto`. Ambos devuelven movimientos, aunque el
   * servicio tipa el primero como `ResultadoTabla<Grupo>`; por eso se acepta cualquier resultado de tabla.
   */
  fnPeticion: PeticionTabla
  movimientoTipoId?: number | number[]
  /** No pide nada mientras valga `0`. */
  proyectoId?: number
  usuariosIds?: Key[]
  areasIds?: number[]
  bodegasIds?: number[]
  /** No pide nada mientras valga `0`; cada cambio vuelve a pedir la tabla. */
  conteoRefresh?: number
  grupoNombre?: string
  movimientoTipoNombre?: string
  activos?: boolean
}

/* ------------------------------------------------------------------------------------------------------------
 * Formularios de búsqueda
 * ---------------------------------------------------------------------------------------------------------- */

/** Valores de `componentes/formaPDBP` (préstamo, devolución, baja y previo). */
export interface ValoresBusquedaPDBP {
  clave?: string
  /** Solo con `mostrarBajas`: `'13'` justificada, `'16'` injustificada (ids de `movimiento_tipo`). */
  tipoBaja?: '13' | '16'
}

export interface FormaBusquedaPDBPProps {
  /** Si devuelve (o resuelve) un valor verdadero, se limpia el campo `clave`. */
  handleFinish: (valores: ValoresBusquedaPDBP) => unknown
  cargando?: boolean
  habilitado?: boolean
  mostrarBajas?: boolean
  /** Lo pasan las operaciones; el formulario no lo usa (se deshabilita con `cargando`). */
  guardando?: boolean
}

/** Valores de `componentes/formaBusquedaPorProyecto`. */
export interface ValoresBusquedaPorProyecto {
  proyectoInterno?: number
  areas?: number[]
  /** Valor inicial `[1]` (no hay campo visible). */
  bodegas?: number[]
  usuarios?: ValorEtiquetado[]
}

export interface FormaBusquedaPorProyectoProps {
  handleFinish: (valores: ValoresBusquedaPorProyecto) => unknown
  cargando?: boolean
  habilitado?: boolean
  mostrarProyectosInternos?: boolean
  mostrarProyectosExternos?: boolean
  mostrarUsuarios?: boolean
  mostrarAreas?: boolean
  /** Sin efecto: el campo de almacenes está desactivado. */
  mostrarBodegas?: boolean
  /** Por defecto `true`. */
  proyectoObligatorio?: boolean
  /** Por defecto `false`. */
  usuariosObligatorio?: boolean
}

/* ------------------------------------------------------------------------------------------------------------
 * Configuración de grupo (`componentes/formaConfiguracionGrupo`)
 * ---------------------------------------------------------------------------------------------------------- */

/** Valores del formulario de configuración de un grupo (nuevo listado o edición de compra). */
export interface ValoresConfiguracionGrupo {
  nombre: string
  proyectoInterno?: number
  proyectoExterno?: number
  /** Valor inicial `1`. */
  bodega?: number
  proveedor?: ValorEtiquetado
  tipoFactura?: number
  fechaInicio?: Dayjs
  fechaFin?: Dayjs
  usuariosResponsables?: ValorEtiquetado[]
}

export interface FormaConfiguracionGrupoProps {
  handleFinish: (valores: ValoresConfiguracionGrupo) => unknown
  guardando?: boolean
  /** Mientras `nombre` sea `undefined` se muestra un spinner. */
  valoresIniciales: Partial<ValoresConfiguracionGrupo>
  mostrarProyectosInternos?: boolean
  mostrarProyectosExternos?: boolean
  mostrarUsuarios?: boolean
  mostrarProveedores?: boolean
  mostrarTipoFactura?: boolean
  mostrarFechaInicial?: boolean
  mostrarFechaFinal?: boolean
  mostrarBodega?: boolean
  botonTexto?: ReactNode
  /** Por defecto `'Fecha Inicio'`. */
  fechaInicialTexto?: ReactNode
  /** Por defecto `'Nombre listado'`. */
  textoNombre?: ReactNode
  /** Prefijo del nombre propuesto (`'P'`, `'D'`, `'R'`…); con `'C'` (compras) no hay área ni «Crear Nombre». */
  prefijoMovimiento?: string
}

/* ------------------------------------------------------------------------------------------------------------
 * Altas y compras (`componentes/formaAC`)
 * ---------------------------------------------------------------------------------------------------------- */

export interface FormaNuevoItemACProps {
  /** Se llama al terminar (refresca la tabla de la operación). */
  handleFinish: () => unknown
  cargando?: boolean
  proyectoId?: number
  usuariosIds?: number[]
  grupoId: number | string
  /** `15` compra, `14` alta. */
  movimientoTipoId: number
  /** Lo pasan las operaciones; el formulario no lo usa. */
  guardando?: boolean
  /** Lo pasan las operaciones; el formulario no lo usa. */
  habilitado?: boolean
}

/* ------------------------------------------------------------------------------------------------------------
 * Detalle de artículos
 * ---------------------------------------------------------------------------------------------------------- */

export interface UltimoArticuloAgregadoProps {
  /** `id: 0` (valor por defecto) = sin información. */
  movimiento?: Pick<MovimientoOperacion, 'id'> & Partial<MovimientoOperacion>
}

export interface ArticuloMovimientoProps {
  movimiento: MovimientoOperacion
  loading?: boolean
}

export interface DetalleArticuloOperacionTablaProps {
  movimiento: MovimientoOperacion
}
