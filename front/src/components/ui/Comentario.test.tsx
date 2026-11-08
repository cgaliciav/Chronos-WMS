import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderizar } from 'test/renderizar'
import Comentario from './Comentario'

describe('Comentario (sustituye a Comment de antd 4)', () => {
  it('muestra autor, fecha, contenido y acciones', () => {
    renderizar(
      <Comentario
        author="Ana"
        datetime="hace 2 días"
        content={'Primera línea\nSegunda línea'}
        actions={[<button key="borrar">Borrar</button>]}
      />,
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('hace 2 días')).toBeInTheDocument()
    expect(screen.getByText(/Primera línea/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeInTheDocument()
  })

  it('omite autor y acciones si no se pasan', () => {
    renderizar(<Comentario content="Solo texto" />)
    expect(screen.getByText('Solo texto')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
