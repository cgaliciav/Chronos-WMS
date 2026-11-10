import { convertirEnlaceHash } from './enlacesHash'

describe('convertirEnlaceHash', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('convierte un enlace antiguo con hash, conservando la consulta', () => {
    window.history.replaceState(null, '', '/#/compras/operacion?uid=15')
    expect(convertirEnlaceHash()).toBe('/compras/operacion?uid=15')
    expect(window.location.pathname).toBe('/compras/operacion')
    expect(window.location.search).toBe('?uid=15')
    expect(window.location.hash).toBe('')
  })

  it('no toca rutas sin hash ni anclas normales', () => {
    window.history.replaceState(null, '', '/catalogo/general')
    expect(convertirEnlaceHash()).toBeNull()
    window.history.replaceState(null, '', '/catalogo/general#seccion')
    expect(convertirEnlaceHash()).toBeNull()
    expect(window.location.pathname).toBe('/catalogo/general')
  })
})
