import { describe, expect, it } from 'vitest'
import { formatoMonedaMexico, normalizeAndFilterOptions } from './funcionesExtras'

describe('helpers/funcionesExtras', () => {
  it('formatoMonedaMexico separa miles y fija dos decimales', () => {
    expect(formatoMonedaMexico(1234.5)).toBe('$ 1,234.50')
    expect(formatoMonedaMexico('1500')).toBe('$ 1,500.00')
    expect(formatoMonedaMexico(0)).toBe('$ 0.00')
    expect(formatoMonedaMexico(1234567.891)).toBe('$ 1,234,567.89')
  })

  it('normalizeAndFilterOptions ignora acentos y mayúsculas', () => {
    expect(normalizeAndFilterOptions('almacen', { label: 'Almacén Central' })).toBe(true)
    expect(normalizeAndFilterOptions('ÁREA', { label: 'area norte' })).toBe(true)
    expect(normalizeAndFilterOptions('xyz', { label: 'Almacén' })).toBe(false)
    expect(normalizeAndFilterOptions('a', {})).toBe(false)
  })
})
