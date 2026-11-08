import { PeticionBase } from '..'
import type { InventarioActual, ParametrosTabla, ResultadoTabla } from 'types/api'

const recurso = 'current-inventory'

/** Inventario actual / catálogos (`/current-inventory`). */
export default class InventarioActualPeticiones {
  static listadoCatalogoGeneral = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<InventarioActual>>(recurso, 'list-catalog-general', parametros)
  static listadoCatalogoPorCodigo = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<InventarioActual>>(recurso, 'list-catalog-codes', parametros)
  static listadoCatalogoBajas = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<InventarioActual>>(recurso, 'list-catalog-deregister', parametros)
  static listadoCatalogoProyectos = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<InventarioActual>>(recurso, 'list-catalog-project', parametros)
  static listadoCatalogoFacturas = (parametros: ParametrosTabla = {}) =>
    PeticionBase.generalPost<ResultadoTabla<InventarioActual>>(recurso, 'list-catalog-invoices', parametros)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<InventarioActual>(recurso, id)
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
}
