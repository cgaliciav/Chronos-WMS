import { describe, expect, it, vi } from 'vitest'
import { cargarEntorno } from './entorno'

function respuesta(cuerpo: string, ok = true, status = 200): Response {
  return new Response(cuerpo, { status: ok ? status : 404 })
}

describe('cargarEntorno', () => {
  it('devuelve el JSON y pide sin caché', async () => {
    const fetcher = vi.fn().mockResolvedValue(respuesta('{"cliente":"amz","entorno":"staging"}'))
    const entorno = await cargarEntorno(fetcher as unknown as typeof fetch)
    expect(entorno).toEqual({ cliente: 'amz', entorno: 'staging' })
    expect(fetcher).toHaveBeenCalledWith(
      '/entorno.json',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('devuelve {} ante 404', async () => {
    const fetcher = vi.fn().mockResolvedValue(respuesta('no', false))
    expect(await cargarEntorno(fetcher as unknown as typeof fetch)).toEqual({})
  })

  it('devuelve {} ante error de red', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('red'))
    expect(await cargarEntorno(fetcher as unknown as typeof fetch)).toEqual({})
  })

  it('devuelve {} ante JSON inválido o que no es objeto', async () => {
    expect(await cargarEntorno(vi.fn().mockResolvedValue(respuesta('<html>')) as never)).toEqual({})
    expect(await cargarEntorno(vi.fn().mockResolvedValue(respuesta('[1]')) as never)).toEqual({})
  })

  it('devuelve {} si tarda más de 2 s', async () => {
    vi.useFakeTimers()
    try {
      const fetcher = vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_res, rej) => {
            init?.signal?.addEventListener('abort', () =>
              rej(new DOMException('abort', 'AbortError')),
            )
          }),
      )
      const promesa = cargarEntorno(fetcher as unknown as typeof fetch)
      await vi.advanceTimersByTimeAsync(2100)
      expect(await promesa).toEqual({})
    } finally {
      vi.useRealTimers()
    }
  })
})
