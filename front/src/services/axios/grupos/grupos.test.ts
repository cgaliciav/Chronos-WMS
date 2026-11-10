import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { API, servidor } from 'test/servidor'
import GrupoPeticiones from '.'

describe('GrupoPeticiones', () => {
  it('finalizar hace PUT /groups/closure/:id (corrige F3)', async () => {
    let llamada = ''
    servidor.use(
      http.put(`${API}/groups/closure/:id`, ({ request, params }) => {
        llamada = `${request.method} ${params.id}`
        return HttpResponse.json({ message: 'ok' })
      }),
    )
    await GrupoPeticiones.finalizar(42)
    expect(llamada).toBe('PUT 42')
  })

  it('agregarMovimiento hace PUT /groups/activity con los parámetros', async () => {
    let cuerpo: unknown
    servidor.use(
      http.put(`${API}/groups/activity`, async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({ id: 1, cantidad: 1, estatus: 'activo' })
      }),
    )
    const movimiento = await GrupoPeticiones.agregarMovimiento({ grupoId: 3, clave: 'ABC' })
    expect(cuerpo).toEqual({ grupoId: 3, clave: 'ABC' })
    expect(movimiento.id).toBe(1)
  })
})
