import { PeticionBase, type ElementoListado } from '..'

const recurso = 'role'

/** Roles (`/role`). */
export default class RolPeticiones {
  static listadoSimple = () => PeticionBase.listadoSimple<ElementoListado>(recurso)
}
