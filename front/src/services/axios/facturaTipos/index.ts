import { PeticionBase, type ElementoListado } from '..'

const recurso = 'invoice-kind'

/** Tipos de factura (`/invoice-kind`). */
export default class FacturaTipoPeticiones {
  static listadoSimple = () => PeticionBase.listadoSimple<ElementoListado>(recurso)
}
