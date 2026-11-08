import { describe, expect, it } from 'vitest'
import { caminoEnMenu, filtrarMenu } from './useMenuItems'
import { menuItems } from './menuItems'

describe('menú por permisos', () => {
  it('ADMINISTRADOR ve todo el menú', () => {
    expect(filtrarMenu(menuItems, ['ADMINISTRADOR'])).toHaveLength(menuItems.length)
  })

  it('un usuario solo ve las entradas de sus roles y sin submenús vacíos', () => {
    const visibles = filtrarMenu(menuItems, [
      'V-CATALOGOS-TITULO',
      'V-CATALOGO-MENU',
      'V-CATALOGO-GENERAL',
    ])
    expect(visibles.map(e => e.title)).toEqual(['Catálogos', 'Catálogos'])
    expect(visibles[1].children?.map(e => e.url)).toEqual(['/catalogo/general'])
  })

  it('sin el rol del submenú no aparecen sus hojas aunque tenga el de la hoja', () => {
    const visibles = filtrarMenu(menuItems, ['V-CATALOGO-GENERAL'])
    expect(visibles).toEqual([])
  })

  it('caminoEnMenu devuelve los títulos hasta la página (migas de pan)', () => {
    expect(caminoEnMenu('/catalogo/general').map(e => e.title)).toEqual([
      'Catálogos',
      'Búsqueda General',
    ])
    expect(caminoEnMenu('/no-existe')).toEqual([])
  })
})
