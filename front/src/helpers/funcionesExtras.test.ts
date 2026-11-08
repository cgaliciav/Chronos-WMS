import { describe, expect, it } from 'vitest'
import {
  filtrarOpcion,
  formatoMonedaMexico,
  idDeEtiquetado,
  normalizeAndFilterOptions,
} from './funcionesExtras'

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
  it('filtrarOpcion lee los hijos de mapeoOpciones, el texto o la label de la opción', () => {
    expect(filtrarOpcion('alm', { children: ['Almacén Central', ' '] })).toBe(true)
    expect(filtrarOpcion('norte', { children: 'Área Norte' })).toBe(true)
    expect(filtrarOpcion('PROY', { label: 'proyecto x' })).toBe(true)
    expect(filtrarOpcion('zzz', { children: ['Almacén', ' '] })).toBe(false)
    expect(filtrarOpcion('a', undefined)).toBe(false)
  })
  it('idDeEtiquetado lee value (antd 5+) y cae a key (antd 4)', () => {
    expect(idDeEtiquetado({ value: 7, label: 'Ana' })).toBe(7)
    expect(idDeEtiquetado({ key: 3 })).toBe(3)
    expect(idDeEtiquetado(undefined)).toBeUndefined()
    expect(
      [
        { value: 1, label: 'a' },
        { value: 2, label: 'b' },
      ].map(idDeEtiquetado),
    ).toEqual([1, 2])
  })
})
