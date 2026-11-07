import { PeticionBase } from '..'

/* 
*******************
*******************
INVENTARIO ACTUAL
*******************
*******************
*/

const portionEndPoint = 'current-inventory'

export default class InventarioAcualPeticiones extends PeticionBase {
  static listadoCatalogoGeneral = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'list-catalog-general', parametros)

  static listadoCatalogoPorCodigo = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'list-catalog-codes', parametros)

  static listadoCatalogoBajas = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'list-catalog-deregister', parametros)

  static listadoCatalogoProyectos = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'list-catalog-project', parametros)

  static listadoCatalogoFacturas = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'list-catalog-invoices', parametros)

  static obtenerId = id => super.obtenerId(portionEndPoint, id)

  static editar = (parametros = {}) => super.editar(portionEndPoint, parametros)
}
