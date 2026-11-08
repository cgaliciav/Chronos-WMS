import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderizar } from 'test/renderizar'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import FormaEdicionDisponibilidad from './formaEdicionDisponibilidad'

describe('FormaEdicionDisponibilidad (DatePicker con dayjs, antd 5)', () => {
  const fecha = dayjs('2026-03-15T00:00:00')
  const valores = {
    id: 1,
    cantidad: 3,
    cantidadAlmacen: 5,
    disponible: 'cuarentena',
    fechaDisponibilidad: fecha,
  }

  it('muestra la fecha inicial con el formato DD/MMM/YY', () => {
    renderizar(
      <FormaEdicionDisponibilidad valoresIniciales={valores} guardando={false} habilitado handleFinish={vi.fn()} />,
    )
    expect(screen.getByDisplayValue(fecha.format('DD/MMM/YY'))).toBeInTheDocument()
  })

  it('envía la fecha como objeto dayjs', async () => {
    const handleFinish = vi.fn()
    renderizar(
      <FormaEdicionDisponibilidad valoresIniciales={valores} guardando={false} habilitado handleFinish={handleFinish} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    const enviado = handleFinish.mock.calls[0][0]
    expect(dayjs.isDayjs(enviado.fechaDisponibilidad)).toBe(true)
    expect(enviado.fechaDisponibilidad.isSame(fecha, 'day')).toBe(true)
    expect(enviado).toMatchObject({ cantidad: 3, cantidadAlmacen: 5, disponible: 'cuarentena' })
  })

  it('muestra el esqueleto mientras no hay datos', () => {
    const { container } = renderizar(
      <FormaEdicionDisponibilidad valoresIniciales={{ ...valores, id: 0 }} guardando={false} habilitado handleFinish={vi.fn()} />,
    )
    expect(container.querySelector('.ant-skeleton')).not.toBeNull()
  })
})
