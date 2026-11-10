import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { guardarToken } from 'helpers/storage'
import { http, HttpResponse } from 'msw'
import { API, servidor } from 'test/servidor'
import { renderizarEnRuta } from 'test/conRouter'
import { useNotificacionesStore } from 'stores/notificaciones.store'
import NotificacionesCampana from './NotificacionesCampana'

describe('NotificacionesCampana', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    useNotificacionesStore.setState({ notificaciones: [] })
  })

  it('no se muestra si VITE_NOTIFICACIONES no es "on" (plan 01 D14)', () => {
    vi.stubEnv('VITE_NOTIFICACIONES', 'off')
    renderizarEnRuta(<NotificacionesCampana />)
    expect(screen.queryByLabelText('Notificaciones')).toBeNull()
  })

  it('muestra el número de notificaciones sin leer', async () => {
    vi.stubEnv('VITE_NOTIFICACIONES', 'on')
    servidor.use(
      http.get(`${API}/notifications/`, () =>
        HttpResponse.json([
          { id: 1, titulo: 'Préstamo vencido', fecha: '2026-11-01', leida: false },
          { id: 2, titulo: 'Devolución registrada', fecha: '2026-11-02', leida: false },
          { id: 3, titulo: 'Antigua', fecha: '2026-10-01', leida: true },
        ]),
      ),
    )
    renderizarEnRuta(<NotificacionesCampana />)
    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument()
  })

  it('abre el reporte del API en otra pestaña con el token y navega a las rutas del front', async () => {
    vi.stubEnv('VITE_NOTIFICACIONES', 'on')
    guardarToken('tok-1')
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null)
    const leidas: string[] = []
    servidor.use(
      http.get(`${API}/notifications/`, () =>
        HttpResponse.json([
          { id: 1, titulo: 'Reporte generado', fecha: '2026-11-01', leida: false, tipo: 'reporte', url: '/file/report/Alta%20A.xlsx' },
          { id: 2, titulo: 'Préstamo vencido', fecha: '2026-11-02', leida: false, tipo: 'prestamo', url: '/prestamos/operacion?uid=3' },
        ]),
      ),
      http.put(`${API}/notifications/:id/read`, ({ params }) => {
        leidas.push(String(params.id))
        return HttpResponse.json({})
      }),
    )
    const { router } = renderizarEnRuta(<NotificacionesCampana />)
    await userEvent.click(await screen.findByLabelText('Notificaciones'))

    await userEvent.click(await screen.findByText('Reporte generado'))
    expect(abrir).toHaveBeenCalledWith(`${API}/file/report/Alta%20A.xlsx?auth=tok-1`, '_blank', 'noopener')

    await userEvent.click(screen.getByText('Préstamo vencido'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/prestamos/operacion'))
    expect(router.state.location.search).toBe('?uid=3')
    expect(leidas).toEqual(['1', '2'])
    abrir.mockRestore()
  })

  it('"Marcar todas como leídas" llama a read-all y deja el contador a cero', async () => {
    vi.stubEnv('VITE_NOTIFICACIONES', 'on')
    let llamadas = 0
    servidor.use(
      http.get(`${API}/notifications/`, () =>
        HttpResponse.json([
          { id: 1, titulo: 'Uno', fecha: '2026-11-01', leida: false },
          { id: 2, titulo: 'Dos', fecha: '2026-11-02', leida: false },
        ]),
      ),
      http.put(`${API}/notifications/read-all`, () => {
        llamadas++
        return HttpResponse.json({ actualizadas: 2 })
      }),
    )
    renderizarEnRuta(<NotificacionesCampana />)
    expect(await screen.findByText('2')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Notificaciones'))
    await userEvent.click(await screen.findByText('Marcar todas como leídas'))
    await waitFor(() => expect(useNotificacionesStore.getState().noLeidas()).toBe(0))
    expect(llamadas).toBe(1)
    expect(screen.queryByText('Marcar todas como leídas')).toBeNull()
  })
})
