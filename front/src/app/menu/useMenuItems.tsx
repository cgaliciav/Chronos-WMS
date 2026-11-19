import { createElement, useMemo } from 'react'
import type { MenuProps } from 'antd'
import { Link } from 'react-router'
import { useUsuarioStore } from 'stores/usuario.store'
import { menuItems, type EntradaMenu } from './menuItems'

type ElementoMenu = NonNullable<MenuProps['items']>[number]

/** Roles que `ADMINISTRADOR` no sustituye: la Configuración es solo del perfil Superadministrador (decisión 22). */
export const ROLES_SIN_ATAJO_ADMINISTRADOR = ['CONFIGURACION-EDITAR']

/** ¿Puede ver la entrada? `ADMINISTRADOR` ve todo salvo la Configuración; el resto necesita el `role` de la entrada. */
export function entradaPermitida(entrada: EntradaMenu, permisos: string[]): boolean {
  if (permisos.includes(entrada.role)) return true
  return permisos.includes('ADMINISTRADOR') && !ROLES_SIN_ATAJO_ADMINISTRADOR.includes(entrada.role)
}

/** Primera pantalla del menú que el usuario puede abrir (para la redirección inicial). */
export function primeraRutaPermitida(permisos: string[]): string | undefined {
  const buscar = (entradas: EntradaMenu[]): string | undefined => {
    for (const entrada of entradas) {
      const ruta = entrada.children ? buscar(entrada.children) : entrada.url
      if (ruta) return ruta
    }
    return undefined
  }
  return buscar(filtrarMenu(menuItems, permisos))
}

/** Filtra el menú por permisos (recursivo) y quita los submenús que se quedan vacíos. */
export function filtrarMenu(entradas: EntradaMenu[], permisos: string[]): EntradaMenu[] {
  return entradas
    .filter(entrada => entradaPermitida(entrada, permisos))
    .map(entrada =>
      entrada.children
        ? { ...entrada, children: filtrarMenu(entrada.children, permisos) }
        : entrada,
    )
    .filter(entrada => !entrada.children || entrada.children.length > 0)
}

function aElementoMenu(entrada: EntradaMenu): ElementoMenu {
  const icon = entrada.icon ? createElement(entrada.icon) : undefined
  if (entrada.category)
    return { type: 'group', key: `grupo-${entrada.title}`, label: entrada.title }
  if (entrada.children) {
    return {
      key: entrada.key ?? entrada.title,
      icon,
      label: entrada.title,
      children: entrada.children.map(aElementoMenu),
    }
  }
  return {
    key: entrada.key ?? entrada.url ?? entrada.title,
    icon,
    label: entrada.url ? <Link to={entrada.url}>{entrada.title}</Link> : entrada.title,
  }
}

/** Camino (de la raíz a la hoja) hasta la entrada cuya `url` coincide con `pathname`, o `[]`. */
export function caminoEnMenu(pathname: string, entradas: EntradaMenu[] = menuItems): EntradaMenu[] {
  for (const entrada of entradas) {
    if (entrada.url === pathname) return [entrada]
    if (entrada.children) {
      const camino = caminoEnMenu(pathname, entrada.children)
      if (camino.length) return [entrada, ...camino]
    }
  }
  return []
}

/** Elementos del menú lateral para el usuario actual y las claves seleccionada/abierta según la ruta. */
export function useMenuItems(pathname: string) {
  const permisos = useUsuarioStore(estado => estado.permisos)
  return useMemo(() => {
    const visibles = filtrarMenu(menuItems, permisos)
    // Los títulos de grupo sin ninguna entrada visible después se ocultan.
    const conGrupos = visibles.filter((entrada, i) => {
      if (!entrada.category) return true
      const siguiente = visibles[i + 1]
      return siguiente !== undefined && !siguiente.category
    })
    const camino = caminoEnMenu(pathname, visibles)
    const hoja = camino.at(-1)
    return {
      items: conGrupos.map(aElementoMenu),
      seleccionadas: hoja ? [hoja.key ?? hoja.url ?? hoja.title] : [],
      abiertas: camino.slice(0, -1).map(entrada => entrada.key ?? entrada.title),
      camino,
    }
  }, [permisos, pathname])
}
