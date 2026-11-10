import { PeticionBase } from '..'
import type {
  Grupo,
  Movimiento,
  ParametrosTabla,
  ResultadoTabla,
} from 'types/api'

const recurso = 'groups'

type Parametros = object

/** Grupos / listados de movimientos (`/groups`). */
export default class GrupoPeticiones {
  static listado = (parametros: ParametrosTabla = {}) =>
    PeticionBase.listado<Grupo>(recurso, parametros)
  static listadoPorProyecto = (parametros: ParametrosTabla = {}) =>
    // El API devuelve movimientos (no grupos) en `list-by-project-antd`.
    PeticionBase.generalPost<ResultadoTabla<Movimiento>>(
      recurso,
      'list-by-project-antd',
      parametros,
    )
  static listadoPorGrupo = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<Grupo>>(recurso, 'list-by-group-antd', parametros)
  static habilitar = (id: number | string) => PeticionBase.habilitar(recurso, id)
  static inhabilitar = (id: number | string) => PeticionBase.inhabilitar(recurso, id)
  /** `PUT /groups/closure/:id` (antes hacía PUT a `list-by-group-antd`, hallazgo F3). */
  static finalizar = (id: number | string) => PeticionBase.finalizar(recurso, id)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<Grupo>(recurso, id)
  static nuevo = (parametros: Parametros = {}) => PeticionBase.nuevo<Grupo>(recurso, parametros)
  static editar = (parametros: Parametros = {}) => PeticionBase.editar(recurso, parametros)
  static quitar = (parametros: Parametros = {}) =>
    PeticionBase.generalDelete(recurso, 'remove', parametros)
  static nuevoConCompra = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'new-purchase', parametros)
  static nuevoConDetalles = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'new-details', parametros)
  static editarConDetalle = (parametros: Parametros = {}) =>
    PeticionBase.generalPut(recurso, 'edit-details', parametros)
  static editarConCompra = (parametros: Parametros = {}) =>
    PeticionBase.generalPut(recurso, 'edit-purchase', parametros)
  static movimientosPorGrupo = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<Movimiento>>(
      recurso,
      'activity-list-by-group',
      parametros,
    )
  static movimientosActivosProyecto = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<Movimiento>>(
      recurso,
      'active-activity-list',
      parametros,
    )
  static agregarMovimiento = (parametros: Parametros = {}) =>
    PeticionBase.generalPut<Movimiento>(recurso, 'activity', parametros)
  static agregarMovimientoCompra = (parametros: Parametros = {}) =>
    PeticionBase.generalPut<Movimiento>(recurso, 'activity-purchase', parametros)
  static agregarOperacionAMovimiento = (parametros: Parametros = {}) =>
    PeticionBase.generalPut<Movimiento>(recurso, 'activity-add-transaction', parametros)
  static quitarMovimiento = (parametros: Parametros = {}) =>
    PeticionBase.generalDelete(recurso, 'activity', parametros)
  static nuevoListadoDeGrupo = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-group', parametros)
  static nuevoListadoDeCatalogoGeneral = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-catalog', parametros)
  static nuevoListadoDeCatalogoCodigo = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-catalog-codes', parametros)
  static nuevoListadoDeCatalogoBajas = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-catalog-deregister', parametros)
  static nuevoListadoDeCatalogoProyectos = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-catalog-projects', parametros)
  static nuevoListadoDeCatalogoFacturas = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-catalog-invoices', parametros)
  static nuevoListadoDePendientesActivos = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-active-activity-list', parametros)
  static nuevoListadoDeReporteUso = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-report-use', parametros)
  static nuevoListadoDeReporteMovimiento = (parametros: Parametros = {}) =>
    PeticionBase.generalPost<Grupo>(recurso, 'create-list-from-report-activity', parametros)
  static obtenerConteoNombresSimilares = (parametros: Parametros = {}) =>
    PeticionBase.generalPost(recurso, 'similar-names-count', parametros)
}
