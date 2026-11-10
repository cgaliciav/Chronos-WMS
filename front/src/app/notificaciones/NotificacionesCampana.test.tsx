import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
})
