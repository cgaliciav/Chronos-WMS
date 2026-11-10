import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SESION_VACIA, useUsuarioStore } from 'stores/usuario.store'
import { useUiStore } from 'stores/ui.store'
import { renderizarEnRuta } from 'test/conRouter'
import MainLayout from './MainLayout'

describe('MainLayout', () => {
  beforeEach(() => {
    useUsuarioStore.setState({
      ...SESION_VACIA,
      autorizado: true,
      nombre: 'Ana Pruebas',
      permisos: ['V-CATALOGOS-TITULO', 'V-CATALOGO-MENU', 'V-CATALOGO-GENERAL'],
    })
    useUiStore.setState({ menuColapsado: false, esMovil: false, menuMovilAbierto: false })
  })

  it('muestra el nombre del usuario, el menú permitido, las migas y el contenido', () => {
    renderizarEnRuta(<MainLayout>contenido de la página</MainLayout>, '/catalogo/general')
    expect(screen.getByText('Ana Pruebas', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('contenido de la página')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getAllByText('Búsqueda General').length).toBeGreaterThan(0)
    expect(screen.queryByText('Préstamos')).toBeNull()
  })

  it('colapsa el menú lateral con el disparador', async () => {
    const { container } = renderizarEnRuta(<MainLayout>x</MainLayout>, '/catalogo/general')
    await userEvent.click(container.querySelector('.ant-layout-sider-trigger') as HTMLElement)
    expect(useUiStore.getState().menuColapsado).toBe(true)
  })
})
