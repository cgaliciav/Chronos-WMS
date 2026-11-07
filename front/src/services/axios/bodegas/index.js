import { PeticionBase } from '..'

/* 
*******************
*******************
BODEGAS
*******************
*******************
*/

const portionEndPoint = 'warehouse'

export default class BodegaPeticiones extends PeticionBase {
  static listadoSimple = () => super.listadoSimple(portionEndPoint)

  static listado = (parametros = {}) => super.listado(portionEndPoint, parametros)

  static inhabilitar = id => super.inhabilitar(portionEndPoint, id)

  static habilitar = id => super.habilitar(portionEndPoint, id)

  static obtenerId = id => super.obtenerId(portionEndPoint, id)

  static editar = (parametros = {}) => super.editar(portionEndPoint, parametros)

  static nuevo = async (parametros = {}) => super.nuevo(portionEndPoint, parametros)
}

