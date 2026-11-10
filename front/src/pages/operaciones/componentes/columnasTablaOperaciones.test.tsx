import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { guardarToken } from 'helpers/storage'
import { renderizar } from 'test/renderizar'
import { API } from 'test/servidor'
import type { Archivo } from 'types/api'
import ColumnasOperaciones from './columnasTablaOperaciones'

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
