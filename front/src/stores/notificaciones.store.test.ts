import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { API, servidor } from 'test/servidor'
import { guardarToken } from 'helpers/storage'
import { INTERVALO_SONDEO_MS, useNotificacionesStore } from './notificaciones.store'

/** EventSource mínimo: jsdom no lo implementa. */
class EventSourceFalso {
  static CLOSED = 2
  static ultima: EventSourceFalso | undefined
  readyState = 1
  onerror: (() => void) | null = null
  cerrada = false
  private escuchas = new Map<string, ((e: MessageEvent<string>) => void)[]>()
  constructor(public url: string) {
    EventSourceFalso.ultima = this
  }
  addEventListener(tipo: string, fn: (e: MessageEvent<string>) => void) {
    this.escuchas.set(tipo, [...(this.escuchas.get(tipo) ?? []), fn])
  }
  emitir(tipo: string, datos: unknown) {
    for (const fn of this.escuchas.get(tipo) ?? [])
      fn(new MessageEvent(tipo, { data: JSON.stringify(datos) }))
  }
  close() {
    this.cerrada = true
  }
}

describe('notificaciones.store · conectar', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_NOTIFICACIONES', 'on')
    useNotificacionesStore.setState({
      notificaciones: [{ id: 1, titulo: 'Vieja', fecha: '2026-11-01', leida: true }],
      conteo: null,
    })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('abre el SSE con el token en la URL y añade al principio las notificaciones que llegan', () => {
    guardarToken('tok-sse')
    vi.stubGlobal('EventSource', EventSourceFalso)
    const cerrar = useNotificacionesStore.getState().conectar()
    const fuente = EventSourceFalso.ultima!
    expect(fuente.url).toBe(`${API}/notifications/stream?auth=tok-sse`)

    fuente.emitir('notificacion', { id: 2, titulo: 'Nueva', fecha: '2026-11-10', leida: false })
    expect(useNotificacionesStore.getState().notificaciones.map(n => n.id)).toEqual([2, 1])
    expect(useNotificacionesStore.getState().noLeidas()).toBe(1)

    cerrar()
    expect(fuente.cerrada).toBe(true)
  })

  it('usa el total del evento "conteo", lo sube con cada nueva y lo baja al marcar', async () => {
    vi.stubGlobal('EventSource', EventSourceFalso)
    servidor.use(
      http.put(`${API}/notifications/:id/read`, () => HttpResponse.json({})),
      http.put(`${API}/notifications/read-all`, () => HttpResponse.json({ actualizadas: 1 })),
    )
    const cerrar = useNotificacionesStore.getState().conectar()
    const fuente = EventSourceFalso.ultima!
    const noLeidas = () => useNotificacionesStore.getState().noLeidas()

    fuente.emitir('conteo', { noLeidas: 120 }) // más que las que caben en la lista
    expect(noLeidas()).toBe(120)
    fuente.emitir('notificacion', { id: 2, titulo: 'Nueva', fecha: '2026-11-10', leida: false })
    expect(noLeidas()).toBe(121)
    fuente.emitir('notificacion', { id: 2, titulo: 'Nueva', fecha: '2026-11-10', leida: false }) // repetida
    expect(noLeidas()).toBe(121)

    await useNotificacionesStore.getState().marcarLeida(2)
    expect(noLeidas()).toBe(120)
    await useNotificacionesStore.getState().marcarLeida(1) // ya estaba leída: no cambia
    expect(noLeidas()).toBe(120)
    await useNotificacionesStore.getState().marcarTodas()
    expect(noLeidas()).toBe(0)
    cerrar()
  })

  it('si el SSE se cierra (p. ej. 401), pasa a pedir la lista cada 60 s', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('EventSource', EventSourceFalso)
    let pedidas = 0
    servidor.use(
      http.get(`${API}/notifications/`, () => {
        pedidas++
        return HttpResponse.json([])
      }),
    )
    const cerrar = useNotificacionesStore.getState().conectar()
    const fuente = EventSourceFalso.ultima!
    fuente.readyState = EventSourceFalso.CLOSED
    fuente.onerror?.()
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS)
    expect(pedidas).toBe(1)
    cerrar()
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS)
    expect(pedidas).toBe(1)
  })

  it('sin EventSource en el navegador, sondea desde el principio', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('EventSource', undefined)
    let pedidas = 0
    servidor.use(
      http.get(`${API}/notifications/`, () => {
        pedidas++
        return HttpResponse.json([])
      }),
    )
    const cerrar = useNotificacionesStore.getState().conectar()
    await vi.advanceTimersByTimeAsync(INTERVALO_SONDEO_MS * 2)
    expect(pedidas).toBe(2)
    cerrar()
  })
})
