import { PeticionBase, type ElementoListado } from '..'
import type { ParametrosTabla, Proveedor } from 'types/api'

const recurso = 'supplier'

/** Proveedores (`/supplier`). */
export default class ProveedorPeticiones {
  static listadoSimple = () => PeticionBase.listadoSimple<ElementoListado>(recurso)
  static listadoSimpleDinamico = (parametros: object = {}) =>
    PeticionBase.generalPost<ElementoListado[]>(recurso, 'list-dynamic', parametros)
  static listado = (parametros: ParametrosTabla = {}) =>
    PeticionBase.listado<Proveedor>(recurso, parametros)
  static inhabilitar = (id: number | string) => PeticionBase.inhabilitar(recurso, id)
  static habilitar = (id: number | string) => PeticionBase.habilitar(recurso, id)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<Proveedor>(recurso, id)
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
}
