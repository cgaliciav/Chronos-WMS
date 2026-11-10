import { describe, expect, it } from 'vitest'
import dayjs from './fechas'

describe('helpers/fechas (dayjs en lugar de moment)', () => {
  const fecha = dayjs('2026-03-15T10:30:00')

  it('usa el locale es-mx', () => {
    expect(dayjs.locale()).toBe('es-mx')
    expect(fecha.format('D MMMM YYYY')).toBe('15 marzo 2026')
  })

  it('mantiene los formatos que usaban las páginas con moment', () => {
    expect(fecha.format('x')).toBe(String(fecha.valueOf()))
    expect(fecha.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-03-15 10:30:00')
    expect(fecha.format('ll')).toMatch(/15.*mar.*2026/)
  })

  it('fromNow en español e isSameOrAfter disponibles', () => {
    expect(dayjs().subtract(2, 'day').fromNow()).toBe('hace 2 días')
    expect(fecha.isSameOrAfter(fecha.subtract(1, 'month'))).toBe(true)
    // `add(…, 'days')` en plural, como lo escribía el código con moment.
    expect(fecha.add(1, 'days').date()).toBe(16)
  })
})
