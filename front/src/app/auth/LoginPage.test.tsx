import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { notification } from 'helpers/feedback'
import { API, servidor } from 'test/servidor'
import { renderizarEnRuta } from 'test/conRouter'
import { SESION_VACIA, useUsuarioStore } from 'stores/usuario.store'
import LoginPage from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    useUsuarioStore.setState({ ...SESION_VACIA })
    vi.spyOn(notification, 'success').mockImplementation(() => {})
    vi.spyOn(notification, 'error').mockImplementation(() => {})
  })

  it('envía { c, p } sin ip, guarda el token y vuelve a la última ruta visitada', async () => {
    let cuerpo: unknown
    servidor.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({ t: 'token-nuevo' })
      }),
    )
    localStorage.setItem('ultimaVisitada', '/compras/nuevo')
    const { router } = renderizarEnRuta(<LoginPage />, '/auth/login')

    await userEvent.type(screen.getByPlaceholderText('Correo electrónico'), 'ana@x.mx')
    await userEvent.type(screen.getByPlaceholderText('Contraseña'), 'secreta')
    await userEvent.click(screen.getByRole('button', { name: 'Acceso' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/compras/nuevo'))
    expect(cuerpo).toEqual({ c: 'ana@x.mx', p: 'secreta' })
    expect(localStorage.getItem('t')).toBe('token-nuevo')
  })

  it('valida los campos obligatorios sin llamar al API', async () => {
    const login = vi.fn()
    useUsuarioStore.setState({ login })
    renderizarEnRuta(<LoginPage />, '/auth/login')
    await userEvent.click(screen.getByRole('button', { name: 'Acceso' }))
    expect(await screen.findByText('Por favor introduce tu correo electrónico')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })
})
