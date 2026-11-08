import { PeticionBase, type ElementoListado } from '..'
import type { ParametrosTabla, Usuario, UsuarioActual } from 'types/api'

const recurso = 'user'

/** Usuarios (`/user`). */
export default class UsuarioPeticiones {
  static listadoSimple = () => PeticionBase.listadoSimple<ElementoListado>(recurso)
  static listado = (parametros: ParametrosTabla = {}) => PeticionBase.listado<Usuario>(recurso, parametros)
  static listadoSimpleCompleto = () => PeticionBase.generalGetNoParam<ElementoListado[]>(recurso, 'list-names-full')
  static listadoSimpleDinamico = (parametros: object = {}) =>
    PeticionBase.generalPost<ElementoListado[]>(recurso, 'list-names-dynamic', parametros)
  /** `PUT /user/renewpassword`: desde la fase 2 del plan 02 el API envía la contraseña por correo. */
  static regenerarPassword = (email: string) =>
    PeticionBase.generalPut<{ correo?: string; enviado?: boolean }>(recurso, 'renewpassword', { email })
  static inhabilitar = (id: number | string) => PeticionBase.inhabilitar(recurso, id)
  static habilitar = (id: number | string) => PeticionBase.habilitar(recurso, id)
  static obtenerId = (id: number | string) => PeticionBase.obtenerId<Usuario>(recurso, id)
  static editar = (parametros: object = {}) => PeticionBase.editar(recurso, parametros)
  static nuevo = (parametros: object = {}) => PeticionBase.nuevo(recurso, parametros)
  static cambiarPassword = (parametros: object) => {
    if (Object.keys(parametros).length === 0) {
      return Promise.reject(new Error('objeto vacío · cambiarPasswordUsuario'))
    }
    return PeticionBase.generalPut(recurso, 'password', parametros)
  }
  static actual = () => PeticionBase.generalGetNoParam<UsuarioActual>(recurso, 'current')
  static obtenerAreas = () => PeticionBase.generalGetNoParam<ElementoListado[]>(recurso, 'get-areas')
  static obtenerBodegas = () => PeticionBase.generalGetNoParam<ElementoListado[]>(recurso, 'get-warehouses')
  static obtenerProyectos = () => PeticionBase.generalGetNoParam<ElementoListado[]>(recurso, 'get-projects')
}
