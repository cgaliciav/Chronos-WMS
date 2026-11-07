import { PeticionBase } from '..'

/* 
*******************
*******************
PRODUCTOS
*******************
*******************
*/

const portionEndPoint = 'groups'

export default class GrupoPeticiones extends PeticionBase {
  // El componente hace la petición
  // static agregarArchivo = (parametros = {}) =>
  //   super.generalPost(portionEndPoint, 'file', parametros)
  static listado = (parametros = {}) => super.listado(portionEndPoint,parametros)

  static listadoPorProyecto = (parametros = {}) => super.generalPost(portionEndPoint,"list-by-project-antd",parametros)

  static listadoPorGrupo = (parametros = {}) => super.generalPost(portionEndPoint,"list-by-group-antd",parametros)

  static habilitar = id => super.habilitar(portionEndPoint,id)
  
  static inhabilitar = id => super.inhabilitar(portionEndPoint,id)
    
  static finalizar = (parametros = {}) => super.generalPut(portionEndPoint,"list-by-group-antd",parametros)

  static obtenerId = id => super.obtenerId(portionEndPoint,id)

  static nuevo = (parametros = {}) => super.nuevo(portionEndPoint,parametros)

  static editar= (parametros = {}) => super.editar(portionEndPoint,parametros)

  static quitar = (parametros = {}) =>
    super.generalDelete(portionEndPoint, 'remove', parametros)

  static nuevoConCompra = (parametros = {}) => super.generalPost(portionEndPoint,"new-purchase",parametros)
  
  static nuevoConDetalles = (parametros = {}) => super.generalPost(portionEndPoint,"new-details",parametros)
  
  static nuevoConInventario = (parametros = {}) => super.generalPost(portionEndPoint,"new-inventory",parametros)
  
  static editarConDetalle = (parametros = {}) => super.generalPut(portionEndPoint,"edit-details",parametros)

  static editarConCompra = (parametros = {}) => super.generalPut(portionEndPoint,"edit-purchase",parametros)

  static editarconInventario = (parametros = {}) => super.generalPut(portionEndPoint,"edit-inventory",parametros)


  static movimientosPorGrupo = (parametros = {}) => super.generalPost(portionEndPoint,"activity-list-by-group",parametros)

  static movimientosActivosProyecto = (parametros = {}) => super.generalPost(portionEndPoint,"active-activity-list",parametros)

  static inventarioPendiente = (parametros = {}) => super.generalPost(portionEndPoint,"inventory-todo-list",parametros)
  
  static inventarioHecho = (parametros = {}) => super.generalPost(portionEndPoint,"inventory-done-list",parametros)


  static agregarMovimiento =  (parametros = {}) => super.generalPut(portionEndPoint,"activity",parametros)

  static agregarMovimientoCompra =  (parametros = {}) => super.generalPut(portionEndPoint,"activity-purchase",parametros)

  static agregarOperacionAMovimiento =  (parametros = {}) => super.generalPut(portionEndPoint,"activity-add-transaction",parametros)

  static quitarMovimiento=(parametros = {}) => super.generalDelete(portionEndPoint, 'activity', parametros)

  static nuevoListadoDeGrupo = (parametros = {}) => super.generalPost(portionEndPoint,'create-list-from-group',parametros)

  static nuevoListadoDeCatalogoGeneral = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-catalog",parametros)

  static nuevoListadoDeCatalogoCodigo = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-catalog-codes",parametros)

  static nuevoListadoDeCatalogoBajas = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-catalog-deregister",parametros)

  static nuevoListadoDeCatalogoProyectos = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-catalog-projects",parametros)

  static nuevoListadoDeCatalogoFacturas = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-catalog-invoices",parametros)

  static nuevoListadoDePendientesActivos = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-active-activity-list",parametros)

  static nuevoListadoDeReporteUso = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-report-use",parametros)

  static nuevoListadoDeReporteMovimiento = (parametros = {}) => super.generalPost(portionEndPoint,"create-list-from-report-activity",parametros)

  static obtenerConteoNombresSimilares = (parametros = {}) => super.generalPost(portionEndPoint,"similar-names-count",parametros)

}
