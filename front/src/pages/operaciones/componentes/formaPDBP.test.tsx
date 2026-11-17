import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderizar } from 'test/renderizar'
import FormaBusquedaPDBP from './formaPDBP'

describe('FormaBusquedaPDBP (clave y cantidad de préstamo, devolución, baja y previo)', () => {
  const pintar = (handleFinish: (valores: unknown) => unknown) => {
    renderizar(<FormaBusquedaPDBP handleFinish={handleFinish} habilitado cargando={false} />)
    return {
      clave: screen.getByLabelText('Clave'),
      cantidad: screen.getByLabelText('Cantidad'),
      buscar: screen.getByRole('button', { name: /buscar/i }),
    }
  }

  it('envía cantidad 1 por defecto', async () => {
    const handleFinish = vi.fn().mockResolvedValue(1)
    const { clave, buscar } = pintar(handleFinish)
    await userEvent.type(clave, 'ABC-1')
    await userEvent.click(buscar)
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(handleFinish.mock.calls[0][0]).toMatchObject({ clave: 'ABC-1', cantidad: 1 })
  })

  it('envía la cantidad capturada y, si la operación se registró, limpia la clave y vuelve a 1', async () => {
    const handleFinish = vi.fn().mockResolvedValue(1)
    const { clave, cantidad, buscar } = pintar(handleFinish)
    await userEvent.type(clave, 'ABC-2')
    await userEvent.clear(cantidad)
    await userEvent.type(cantidad, '3')
    await userEvent.click(buscar)
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(handleFinish.mock.calls[0][0]).toMatchObject({ clave: 'ABC-2', cantidad: 3 })
    await waitFor(() => expect(clave).toHaveValue(''))
    expect(cantidad).toHaveValue('1')
  })

  it('si la operación falla conserva la clave y la cantidad', async () => {
    const handleFinish = vi.fn().mockResolvedValue(0)
    const { clave, cantidad, buscar } = pintar(handleFinish)
    await userEvent.type(clave, 'ABC-3')
    await userEvent.clear(cantidad)
    await userEvent.type(cantidad, '2')
    await userEvent.click(buscar)
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(clave).toHaveValue('ABC-3')
    expect(cantidad).toHaveValue('2')
  })
})
