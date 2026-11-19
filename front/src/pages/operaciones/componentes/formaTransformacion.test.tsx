import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderizar } from 'test/renderizar'
import FormaTransformacion from './formaTransformacion'

describe('FormaTransformacion (plan 04, decisión 20)', () => {
  const pintar = (handleFinish: (valores: unknown) => unknown) =>
    renderizar(<FormaTransformacion handleFinish={handleFinish} habilitado cargando={false} />)

  it('envía el artículo, las unidades usadas y los productos nuevos', async () => {
    const handleFinish = vi.fn().mockResolvedValue(1)
    pintar(handleFinish)
    await userEvent.type(screen.getByLabelText('Clave'), 'EXT-0001')
    await userEvent.type(screen.getAllByLabelText('Título')[0], 'Extensión corta')

    await userEvent.click(screen.getByRole('button', { name: /agregar producto/i }))
    const titulos = screen.getAllByLabelText('Título')
    expect(titulos).toHaveLength(2)
    await userEvent.type(titulos[1], 'Silla con respaldo')
    const cantidades = screen.getAllByLabelText('Cantidad')
    await userEvent.clear(cantidades[0])
    await userEvent.type(cantidades[0], '7')

    await userEvent.click(screen.getByRole('button', { name: /transformar/i }))
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(handleFinish.mock.calls[0][0]).toMatchObject({
      clave: 'EXT-0001',
      cantidad: 1,
      productos: [
        { titulo: 'Extensión corta', cantidad: 7, productoTipoId: 0 },
        { titulo: 'Silla con respaldo', cantidad: 1, productoTipoId: 0 },
      ],
    })
    // Registrada: el formulario queda listo para la siguiente transformación.
    await waitFor(() => expect(screen.getByLabelText('Clave')).toHaveValue(''))
    expect(screen.getAllByLabelText('Título')).toHaveLength(1)
  })

  it('exige al menos un producto con título y no envía si falta', async () => {
    const handleFinish = vi.fn()
    pintar(handleFinish)
    await userEvent.type(screen.getByLabelText('Clave'), 'EXT-0001')
    await userEvent.click(screen.getByRole('button', { name: /transformar/i }))
    expect(await screen.findByText(/al menos 4 caracteres/)).toBeInTheDocument()
    expect(handleFinish).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /quitar producto/i })).toBeDisabled()
  })
})
