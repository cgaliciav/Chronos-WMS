import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { notification } from 'helpers/feedback'
import { API, USUARIO_PRUEBA, servidor } from 'test/servidor'
import { renderizar } from 'test/renderizar'
import { renderizarEnRuta } from 'test/conRouter'
import { SESION_VACIA, useUsuarioStore } from 'stores/usuario.store'
import RaizLayout from 'app/layouts/RaizLayout'
import CambiarPasswordTemporal from './CambiarPasswordTemporal'

describe('contraseña temporal (L2)', () => {
  beforeEach(() => {
    useUsuarioStore.setState({ ...SESION_VACIA })
    vi.spyOn(notification, 'success').mockImplementation(() => {})
    vi.spyOn(notification, 'error').mockImplementation(() => {})
  })

  it('login con contraseña temporal: marca el cambio pendiente y no da la bienvenida', async () => {
    servidor.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ t: 'token-temporal', cambiarPassword: true }),
      ),
    )
    expect(await useUsuarioStore.getState().login('nuevo@x.mx', 'Temp1234')).toBe(true)
    expect(useUsuarioStore.getState()).toMatchObject({
      autorizado: true,
      cambioPasswordPendiente: true,
    })
    expect(notification.success).not.toHaveBeenCalled()
  })

  it('al recargar, GET /user/current con cambiarPassword vuelve a marcarlo', async () => {
    localStorage.setItem('t', 'token-temporal')
    servidor.use(
      http.get(`${API}/user/current`, () =>
        HttpResponse.json({ ...USUARIO_PRUEBA, cambiarPassword: true }),
      ),
    )
    await useUsuarioStore.getState().cargarCuentaActual()
    expect(useUsuarioStore.getState().cambioPasswordPendiente).toBe(true)
  })

  it('con el cambio pendiente, cualquier página privada lleva a /auth/cambiar-password', async () => {
    useUsuarioStore.setState({ autorizado: true, cambioPasswordPendiente: true })
    const router = createMemoryRouter(
      [
        {
          element: <RaizLayout />,
          children: [
            { path: '/compras/nuevo', element: <span>compras</span> },
            { path: '/auth/cambiar-password', element: <span>cambio</span> },
          ],
        },
      ],
      { initialEntries: ['/compras/nuevo'] },
    )
    renderizar(<RouterProvider router={router} />)
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth/cambiar-password'))
    expect(screen.queryByText('compras')).toBeNull()
  })

  it('envía { pa, pn }, guarda el token normal, quita la marca y entra al sistema', async () => {
    useUsuarioStore.setState({ autorizado: true, cambioPasswordPendiente: true })
    localStorage.setItem('t', 'token-temporal')
    let cuerpo: unknown
    servidor.use(
      http.put(`${API}/user/password`, async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({ t: 'token-normal' })
      }),
    )
    const { router } = renderizarEnRuta(<CambiarPasswordTemporal />, '/auth/cambiar-password')

    await userEvent.type(screen.getByLabelText('Contraseña temporal'), 'Temp1234')
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Propia123')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña nueva'), 'Propia123')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(cuerpo).toEqual({ pa: 'Temp1234', pn: 'Propia123' })
    expect(localStorage.getItem('t')).toBe('token-normal')
    expect(useUsuarioStore.getState().cambioPasswordPendiente).toBe(false)
  })

  it('no deja repetir la temporal como nueva', async () => {
    useUsuarioStore.setState({ autorizado: true, cambioPasswordPendiente: true })
    let llamadas = 0
    servidor.use(
      http.put(`${API}/user/password`, () => {
        llamadas++
        return HttpResponse.json({})
      }),
    )
    renderizarEnRuta(<CambiarPasswordTemporal />, '/auth/cambiar-password')
    await userEvent.type(screen.getByLabelText('Contraseña temporal'), 'Temp1234')
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Temp1234')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña nueva'), 'Temp1234')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
    expect(
      await screen.findByText('El password nuevo no debe ser igual al password actual'),
    ).toBeInTheDocument()
    expect(llamadas).toBe(0)
  })
})
