import { describe, expect, it } from 'vitest'

/**
 * Plan 03, fase 0: la identidad de un cliente no vive en el código. Falla si aparece "Sony" o "Teleset" en `src/`,
 * `index.html` o `public/` (fuera de las pruebas); la marca de cada cliente llega del API como configuración.
 */
const MARCA_DE_CLIENTE = /sony|teleset/i

const contenidos: Record<string, string> = {
  ...import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob<string>(['/index.html', '/public/**/*.{json,svg,txt}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
}

describe('sin marca de cliente en el código (plan 03, fase 0)', () => {
  it('src/, index.html y public/ no mencionan a Sony ni a Teleset', () => {
    expect(Object.keys(contenidos).length).toBeGreaterThan(100)
    const conMarca = Object.entries(contenidos)
      .filter(([, texto]) => MARCA_DE_CLIENTE.test(texto))
      .map(([ruta]) => ruta)
    expect(conMarca).toEqual([])
  })
})
