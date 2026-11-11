import { describe, expect, it } from 'vitest'
import { opcionesSentry } from './sentry'

describe('opcionesSentry', () => {
  it('sin DSN devuelve null', () => {
    expect(opcionesSentry(undefined, { cliente: 'amz' }, 'production', '4.9.0')).toBeNull()
    expect(opcionesSentry('', {}, 'production', '4.9.0')).toBeNull()
  })

  it('usa entorno y cliente de /entorno.json', () => {
    const o = opcionesSentry(
      'https://x@y/1',
      { cliente: 'amz', entorno: 'staging' },
      'production',
      '4.9.0',
    )
    expect(o?.environment).toBe('staging')
    expect(o?.initialScope).toEqual({ tags: { cliente: 'amz' } })
    expect(o?.release).toBe('chronos-wms-front@4.9.0')
    expect(o?.tracesSampleRate).toBe(0.1)
  })

  it('sin entorno usa el modo y sin cliente no pone etiqueta', () => {
    const o = opcionesSentry('https://x@y/1', {}, 'production', '4.9.0')
    expect(o?.environment).toBe('production')
    expect(o?.initialScope).toEqual({ tags: {} })
  })
})
