import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Estado de la interfaz (sustituye a `redux/settings`; sin tema ni ajustes de la plantilla, D10). */
export interface EstadoUi {
  menuColapsado: boolean
  esMovil: boolean
  menuMovilAbierto: boolean
  fijarMenuColapsado: (valor: boolean) => void
  alternarMenuColapsado: () => void
  alternarMenuMovil: () => void
}

/** Ancho del menú lateral desplegado (antes `settings.leftMenuWidth`). */
export const ANCHO_MENU = 256
export const ANCHO_MOVIL = 768
export const ANCHO_COLAPSAR_MENU = 1024

export const useUiStore = create<EstadoUi>()(
  persist(
    set => ({
      menuColapsado: false,
      esMovil: false,
      menuMovilAbierto: false,
      fijarMenuColapsado: valor => set({ menuColapsado: valor }),
      alternarMenuColapsado: () => set(estado => ({ menuColapsado: !estado.menuColapsado })),
      alternarMenuMovil: () => set(estado => ({ menuMovilAbierto: !estado.menuMovilAbierto })),
    }),
    {
      name: 'chronos.ui',
      // Solo se recuerda si el menú está colapsado.
      partialize: estado => ({ menuColapsado: estado.menuColapsado }),
    },
  ),
)

/**
 * Detecta la vista móvil (< 768 px) y colapsa el menú en pantallas < 1024 px, al arrancar y al redimensionar
 * (antes lo hacía la saga `SETUP`). Devuelve la función que quita el listener.
 */
export function iniciarDeteccionViewport(): () => void {
  const actualizar = () => {
    const ancho = window.innerWidth
    const esMovil = ancho < ANCHO_MOVIL
    if (useUiStore.getState().esMovil !== esMovil) useUiStore.setState({ esMovil })
    if (ancho < ANCHO_COLAPSAR_MENU) useUiStore.setState({ menuColapsado: true })
  }
  actualizar()
  window.addEventListener('resize', actualizar)
  return () => window.removeEventListener('resize', actualizar)
}
