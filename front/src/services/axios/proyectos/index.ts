import { PeticionBase, type ElementoListado } from '..'
import type { Proyecto, ParametrosTabla } from 'types/api'

const recurso = 'project'

/** Proyectos (`/project`). */
export default class ProyectoPeticiones {
  static listadoSimple = () => PeticionBase.listadoSimple<ElementoListado>(recurso)
  static listado = (parametros: ParametrosTabla = {}) =>
    PeticionBase.listado<Proyecto>(recurso, parametros)
  static inhabilitar = (id: number | string) => PeticionBase.inhabilitar(recurso, id)
  static habilitar = (id: number | string) => PeticionBase.habilitar(recurso, id)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<Proyecto>(recurso, id)
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
}
