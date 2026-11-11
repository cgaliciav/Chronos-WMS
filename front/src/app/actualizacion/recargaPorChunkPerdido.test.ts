import { afterEach, describe, expect, it, vi } from 'vitest'
import { iniciarRecargaPorChunkPerdido } from './recargaPorChunkPerdido'

describe('iniciarRecargaPorChunkPerdido', () => {
  const recargar = vi.fn()

  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('recarga una sola vez si falla un chunk', () => {
    vi.stubGlobal('location', { ...window.location, reload: recargar })
    iniciarRecargaPorChunkPerdido()

    const primero = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(primero)
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(primero.defaultPrevented).toBe(true)

    // Tras recargar, si el chunk sigue fallando no se entra en bucle: el error se deja ver.
    const segundo = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(segundo)
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(segundo.defaultPrevented).toBe(false)
  })
})
