import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { guardarToken } from 'helpers/storage'
import { renderizar } from 'test/renderizar'
import { API } from 'test/servidor'
import type { Archivo } from 'types/api'
import type { ColumnaOperacion, MovimientoOperacion } from '../tipos'
import ColumnasOperaciones from './columnasTablaOperaciones'

describe('columnas cantidad y pendiente (plan 04)', () => {
  const texto = (
    columna: ColumnaOperacion,
    valor: unknown,
    registro: Partial<MovimientoOperacion>,
  ) => {
    const render = columna.render as (
      valor: unknown,
      registro: Partial<MovimientoOperacion>,
    ) => ReactElement
    return renderizar(render(valor, registro)).container.textContent
  }

  it('cantidad: muestra las unidades y marca los expendables', () => {
    expect(texto(ColumnasOperaciones.cantidad, '3.0000', { cantidad: '3.0000' })).toBe('3')
    expect(texto(ColumnasOperaciones.cantidad, 2, { cantidad: 2, consumible: true })).toBe(
      '2Expendable',
    )
  })

  it('pendiente: unidades sin devolver sobre las prestadas', () => {
    expect(texto(ColumnasOperaciones.pendiente, 2, { cantidad: '5.0000', saldoPendiente: 2 })).toBe(
      '2 de 5',
    )
  })

  it('pendiente: un movimiento sin saldo calculado (anterior a la fase 3) sigue pendiente por su cantidad', () => {
    expect(texto(ColumnasOperaciones.pendiente, null, { cantidad: 1, saldoPendiente: null })).toBe(
      '1 de 1',
    )
  })
})

describe('columna foto de las tablas de movimientos', () => {
  const pintar = (archivos: Archivo[] | undefined) => {
    const columna = ColumnasOperaciones.foto(
      () => undefined,
      () => undefined,
    )
    const render = columna.render as (valor: Archivo[] | undefined) => ReactElement
    const { container } = renderizar(render(archivos))
    return container.querySelector('img')?.getAttribute('src')
  }

  it('pide la miniatura al API con una sola barra y el token', () => {
    guardarToken('tok-foto')
    expect(pintar([{ id: 116075 } as Archivo])).toBe(`${API}/file/thumbnail/116075?auth=tok-foto`)
  })

  it('sin archivos muestra la imagen de "sin foto"', () => {
    expect(pintar([])).toBe('/resources/images/no-photo-available.svg')
  })
})
