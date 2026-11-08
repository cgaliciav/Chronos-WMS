import { PeticionBase, type ElementoListado } from '..'
import type { Area, ParametrosTabla } from 'types/api'

const recurso = 'area'

/** Áreas (`/area`). */
export default class AreaPeticiones {
  static listadoSimple = () => PeticionBase.listadoSimple<ElementoListado>(recurso)
  static listado = (parametros: ParametrosTabla = {}) =>
    PeticionBase.listado<Area>(recurso, parametros)
  static inhabilitar = (id: number | string) => PeticionBase.inhabilitar(recurso, id)
  static habilitar = (id: number | string) => PeticionBase.habilitar(recurso, id)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<Area>(recurso, id)
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
}
