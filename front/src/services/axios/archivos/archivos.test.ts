import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { API, servidor } from 'test/servidor'
import ArchivoPeticiones from '.'

describe('ArchivoPeticiones', () => {
  it('obtenerResponseFileDeId firma las URLs con el token', async () => {
    localStorage.setItem('t', 'tk')
    servidor.use(
      http.post(`${API}/file/get-response-interface`, () =>
        HttpResponse.json([{ uid: -1, name: 'a.png', url: '/api/file/1', thumbUrl: '/api/file/thumbnail/1' }]),
      ),
    )
    const [ficha] = await ArchivoPeticiones.obtenerResponseFileDeId({ ids: [1] })
    expect(ficha.url).toBe('/api/file/1?auth=tk')
    expect(ficha.thumbUrl).toBe('/api/file/thumbnail/1?auth=tk')
  })
})
