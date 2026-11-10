import { parametrosBusquedaProyecto } from './parametros'

const paginacion = { current: 2, pageSize: 12, total: 30 }

describe('parametrosBusquedaProyecto', () => {
  it('envía la operación (Select simple) como arreglo de ids', () => {
    const parametros = parametrosBusquedaProyecto(
      { textoBusqueda: 'cable', areas: [1], bodegas: [2, 3], proyecto: 4, tipoMovimiento: 1 },
      paginacion,
    )
    expect(parametros).toEqual({
      pagination: paginacion,
      textoBusqueda: 'cable',
      areasIds: [1],
      bodegaIds: [2, 3],
      proyectoId: 4,
      movimientosTipoIds: [1],
    })
  })

  it('conserva un arreglo y convierte vacío o nulo en arreglo vacío', () => {
    expect(
      parametrosBusquedaProyecto({ tipoMovimiento: [1, 3] }, paginacion).movimientosTipoIds,
    ).toEqual([1, 3])
    expect(
      parametrosBusquedaProyecto({ tipoMovimiento: null }, paginacion).movimientosTipoIds,
    ).toEqual([])
    expect(parametrosBusquedaProyecto({}, paginacion).movimientosTipoIds).toEqual([])
  })

  it('usa texto vacío si no hay búsqueda', () => {
    expect(parametrosBusquedaProyecto({ textoBusqueda: null }, paginacion).textoBusqueda).toBe('')
  })
})
