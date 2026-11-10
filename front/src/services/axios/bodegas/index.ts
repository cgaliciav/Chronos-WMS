import { PeticionBase, type ElementoListado } from '..'
import type { Bodega, ParametrosTabla } from 'types/api'

const recurso = 'warehouse'

/** Bodegas / almacenes (`/warehouse`). */
export default class BodegaPeticiones {
  static listadoSimple = () => PeticionBase.listadoSimple<ElementoListado>(recurso)
  static listado = (parametros: ParametrosTabla = {}) =>
    PeticionBase.listado<Bodega>(recurso, parametros)
  static inhabilitar = (id: number | string) => PeticionBase.inhabilitar(recurso, id)
  static habilitar = (id: number | string) => PeticionBase.habilitar(recurso, id)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<Bodega>(recurso, id)
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
}
