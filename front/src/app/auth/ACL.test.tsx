import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { notification } from 'helpers/feedback'
import { SESION_VACIA, useUsuarioStore } from 'stores/usuario.store'
import { renderizarEnRuta } from 'test/conRouter'
import ACL from './ACL'

describe('ACL', () => {
  beforeEach(() => {
    useUsuarioStore.setState({ ...SESION_VACIA, autorizado: true, permisos: ['COMPRAS-NUEVO'] })
    vi.spyOn(notification, 'error').mockImplementation(() => {})
  })

  it('muestra el contenido con un rol permitido', () => {
    renderizarEnRuta(<ACL roles={['ADMINISTRADOR', 'COMPRAS-NUEVO']}>secreto</ACL>)
    expect(screen.getByText('secreto')).toBeInTheDocument()
  })

  it('oculta el contenido sin rol y sin redirect', () => {
    const { router } = renderizarEnRuta(<ACL roles={['ADMINISTRADOR']}>secreto</ACL>)
    expect(screen.queryByText('secreto')).toBeNull()
    expect(router.state.location.pathname).toBe('/inicio')
    expect(notification.error).not.toHaveBeenCalled()
  })

  it('con redirect booleano navega a /auth/401 y avisa', async () => {
    const { router } = renderizarEnRuta(
      <ACL roles={['ADMINISTRADOR']} redirect>
        secreto
      </ACL>,
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/auth/401'))
    expect(notification.error).toHaveBeenCalledOnce()
  })

  it('con redirect a una ruta navega a esa ruta', async () => {
    const { router } = renderizarEnRuta(
      <ACL roles={['ADMINISTRADOR']} redirect="/catalogo/general">
        secreto
      </ACL>,
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/catalogo/general'))
  })
})
