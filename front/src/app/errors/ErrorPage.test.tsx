import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderizarEnRuta } from 'test/conRouter'
import ErrorPage from './ErrorPage'

describe('ErrorPage', () => {
  it.each([
    [401, 'Sin autorización'],
    [404, 'Página no encontrada'],
    [500, 'Error del servidor'],
    [503, 'Error en la aplicación'],
  ] as const)('%i muestra su título, el código y el botón de inicio', (codigo, titulo) => {
    renderizarEnRuta(<ErrorPage code={codigo} />)
    expect(screen.getByText(`${codigo} · ${titulo}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inicio' })).toBeInTheDocument()
    expect(document.title).toBe(`Chronos WMS | Error ${codigo}`)
  })
})
