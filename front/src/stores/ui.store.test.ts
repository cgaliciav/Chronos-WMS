import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { iniciarDeteccionViewport, useUiStore } from './ui.store'

function fijarAncho(ancho: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: ancho })
}

describe('ui.store', () => {
  beforeEach(() => {
    useUiStore.setState({ menuColapsado: false, esMovil: false, menuMovilAbierto: false })
  })
  afterEach(() => fijarAncho(1440))

  it('persiste solo menuColapsado en localStorage', () => {
    useUiStore.getState().alternarMenuColapsado()
    useUiStore.getState().alternarMenuMovil()

    const guardado = JSON.parse(localStorage.getItem('chronos.ui') ?? '{}')
    expect(guardado.state).toEqual({ menuColapsado: true })
  })

  it('recupera menuColapsado al rehidratar', async () => {
    localStorage.setItem('chronos.ui', JSON.stringify({ state: { menuColapsado: true }, version: 0 }))
    await useUiStore.persist.rehydrate()
    expect(useUiStore.getState().menuColapsado).toBe(true)
  })

  it('detecta vista móvil y colapsa el menú en pantallas pequeñas', () => {
    fijarAncho(700)
    const detener = iniciarDeteccionViewport()
    expect(useUiStore.getState()).toMatchObject({ esMovil: true, menuColapsado: true })

    fijarAncho(1440)
    window.dispatchEvent(new Event('resize'))
    // Al agrandar deja de ser móvil; el menú sigue colapsado (mismo comportamiento que la saga SETUP).
    expect(useUiStore.getState()).toMatchObject({ esMovil: false, menuColapsado: true })
    detener()
  })
})
