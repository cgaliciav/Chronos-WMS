import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { notification } from 'helpers/feedback'
import { API, servidor } from 'test/servidor'
import { apiClient, conToken, PeticionBase } from '.'

describe('apiClient y PeticionBase', () => {
  beforeEach(() => {
    vi.spyOn(notification, 'error').mockImplementation(() => {})
  })

  it('envía el token en la cabecera auth', async () => {
    localStorage.setItem('t', 'mi-token')
    let cabecera: string | null = null
    servidor.use(
      http.get(`${API}/area/list-names`, ({ request }) => {
        cabecera = request.headers.get('auth')
        return HttpResponse.json([])
      }),
    )
    await PeticionBase.listadoSimple('area')
    expect(cabecera).toBe('mi-token')
  })

  it('guarda el token renovado que llega en la cabecera t', async () => {
    servidor.use(
      http.get(`${API}/area/list-names`, () =>
        HttpResponse.json([], {
          headers: { t: 'token-renovado', 'Access-Control-Expose-Headers': 't' },
        }),
      ),
    )
    await PeticionBase.listadoSimple('area')
    expect(localStorage.getItem('t')).toBe('token-renovado')
  })

  it('rechaza la promesa y notifica cuando el API responde error (corrige F1)', async () => {
    servidor.use(
      http.post(`${API}/groups/list-antd`, () =>
        HttpResponse.json({ message: 'Sin permiso' }, { status: 403 }),
      ),
    )
    await expect(PeticionBase.listado('groups', {})).rejects.toMatchObject({
      response: { status: 403 },
    })
    expect(notification.error).toHaveBeenCalledWith({ title: 'Sin permiso' })
  })

  it('rechaza también ante errores de red', async () => {
    servidor.use(http.get(`${API}/area/list-names`, () => HttpResponse.error()))
    await expect(apiClient.get('/area/list-names')).rejects.toBeTruthy()
    expect(notification.error).toHaveBeenCalledOnce()
  })

  it('devuelve el cuerpo de la respuesta', async () => {
    servidor.use(
      http.post(`${API}/groups/list-antd`, async ({ request }) =>
        HttpResponse.json({
          results: [{ id: 1 }],
          pagination: { current: 1, pageSize: 10, total: 1 },
          eco: await request.json(),
        }),
      ),
    )
    const resultado = await PeticionBase.listado<{ id: number }>('groups', { sortField: 'id' })
    expect(resultado.results).toEqual([{ id: 1 }])
    expect(resultado).toMatchObject({ eco: { sortField: 'id' } })
  })

  it('conToken añade ?auth= o &auth= y respeta URLs vacías o sin sesión', () => {
    expect(conToken('/api/file/1')).toBe('/api/file/1')
    localStorage.setItem('t', 'a b')
    expect(conToken('/api/file/1')).toBe('/api/file/1?auth=a%20b')
    expect(conToken('/api/file/1?x=1')).toBe('/api/file/1?x=1&auth=a%20b')
    expect(conToken(undefined)).toBeUndefined()
  })
})
