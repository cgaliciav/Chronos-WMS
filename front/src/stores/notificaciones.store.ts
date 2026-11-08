import { create } from 'zustand'
import NotificacionPeticiones from 'services/axios/notificaciones'
import type { Notificacion } from 'types/api'

/** ¿Está activo el sistema de notificaciones? Solo con `VITE_NOTIFICACIONES=on` (plan 01 D14). */
export const notificacionesActivas = () => import.meta.env.VITE_NOTIFICACIONES === 'on'

interface EstadoNotificaciones {
  notificaciones: Notificacion[]
  cargando: boolean
  noLeidas: () => number
  cargar: () => Promise<void>
  marcarLeida: (id: number) => Promise<void>
}

export const useNotificacionesStore = create<EstadoNotificaciones>()((set, get) => ({
  notificaciones: [],
  cargando: false,
  noLeidas: () => get().notificaciones.filter(n => !n.leida).length,
  cargar: async () => {
    if (!notificacionesActivas()) return
    set({ cargando: true })
    try {
      set({ notificaciones: await NotificacionPeticiones.listado() })
    } catch {
      // El interceptor ya notificó el error; se conserva la lista anterior.
    } finally {
      set({ cargando: false })
    }
  },
  marcarLeida: async id => {
    try {
      await NotificacionPeticiones.marcarLeida(id)
      set(estado => ({
        notificaciones: estado.notificaciones.map(n => (n.id === id ? { ...n, leida: true } : n)),
      }))
    } catch {
      // El interceptor ya notificó el error.
    }
  },
}))
