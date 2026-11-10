import { create } from 'zustand'
import NotificacionPeticiones from 'services/axios/notificaciones'
import type { Notificacion } from 'types/api'

/** ¿Está activo el sistema de notificaciones? Solo con `VITE_NOTIFICACIONES=on` (plan 01 D14). */
export const notificacionesActivas = () => import.meta.env.VITE_NOTIFICACIONES === 'on'

/** Si el SSE no está disponible o se cierra, se vuelve a pedir la lista cada 60 s (plan 02 fase 7). */
export const INTERVALO_SONDEO_MS = 60_000

interface EstadoNotificaciones {
  /** Las más recientes (la primera página del API, 50 como máximo). */
  notificaciones: Notificacion[]
  /**
   * Total de no leídas según el API (`GET /notifications/count` y el evento `conteo` del SSE). `null` mientras no se
   * conoce: entonces se cuentan las de la lista cargada.
   */
  conteo: number | null
  cargando: boolean
  /** Lo que muestra la campana: el total del API, que puede superar a las cargadas en la lista. */
  noLeidas: () => number
  cargar: () => Promise<void>
  marcarLeida: (id: number) => Promise<void>
  marcarTodas: () => Promise<void>
  /** Abre el canal de avisos (SSE, o sondeo si falla). Devuelve la función que lo cierra. */
  conectar: () => () => void
}

export const useNotificacionesStore = create<EstadoNotificaciones>()((set, get) => ({
  notificaciones: [],
  conteo: null,
  cargando: false,
  noLeidas: () => get().conteo ?? get().notificaciones.filter(n => !n.leida).length,
  cargar: async () => {
    if (!notificacionesActivas()) return
    set({ cargando: true })
    try {
      const [notificaciones, { noLeidas }] = await Promise.all([
        NotificacionPeticiones.listado(),
        NotificacionPeticiones.conteo(),
      ])
      set({ notificaciones, conteo: noLeidas })
    } catch {
      // El interceptor ya notificó el error; se conserva la lista anterior.
    } finally {
      set({ cargando: false })
    }
  },
  marcarLeida: async id => {
    const eraNoLeida = get().notificaciones.some(n => n.id === id && !n.leida)
    try {
      await NotificacionPeticiones.marcarLeida(id)
      set(estado => ({
        notificaciones: estado.notificaciones.map(n => (n.id === id ? { ...n, leida: true } : n)),
        conteo:
          estado.conteo === null || !eraNoLeida ? estado.conteo : Math.max(0, estado.conteo - 1),
      }))
    } catch {
      // El interceptor ya notificó el error.
    }
  },
  marcarTodas: async () => {
    try {
      await NotificacionPeticiones.marcarTodas()
      set(estado => ({
        notificaciones: estado.notificaciones.map(n => ({ ...n, leida: true })),
        conteo: 0,
      }))
    } catch {
      // El interceptor ya notificó el error.
    }
  },
  conectar: () => {
    if (!notificacionesActivas()) return () => undefined
    let sondeo: ReturnType<typeof setInterval> | undefined
    let fuente: EventSource | undefined
    const sondear = () => {
      sondeo ??= setInterval(() => void get().cargar(), INTERVALO_SONDEO_MS)
    }
    if (typeof EventSource === 'undefined') {
      sondear()
    } else {
      fuente = new EventSource(NotificacionPeticiones.urlStream())
      fuente.addEventListener('notificacion', evento => {
        const nueva = JSON.parse((evento as MessageEvent<string>).data) as Notificacion
        set(estado => {
          const yaEstaba = estado.notificaciones.some(n => n.id === nueva.id)
          const suma = !yaEstaba && !nueva.leida && estado.conteo !== null ? 1 : 0
          return {
            notificaciones: [nueva, ...estado.notificaciones.filter(n => n.id !== nueva.id)],
            conteo: estado.conteo === null ? null : estado.conteo + suma,
          }
        })
      })
      // El API envía el total al conectar y cada vez que cambia (también si se marcan en otra pestaña).
      fuente.addEventListener('conteo', evento => {
        const { noLeidas } = JSON.parse((evento as MessageEvent<string>).data) as {
          noLeidas: number
        }
        set({ conteo: noLeidas })
      })
      fuente.onerror = () => {
        // El navegador reintenta solo (retry: 10 s); si el API rechazó la conexión (token caducado, 401…),
        // queda cerrada y se pasa a sondeo.
        if (fuente?.readyState === EventSource.CLOSED) sondear()
      }
    }
    return () => {
      fuente?.close()
      if (sondeo) clearInterval(sondeo)
    }
  },
}))
