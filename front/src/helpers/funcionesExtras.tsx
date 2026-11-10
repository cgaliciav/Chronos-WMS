import type { Key, ReactNode } from 'react'
import { Select } from 'antd'

const { Option } = Select

/** Elemento de catálogo para `Select` (`list-names` del API). */
export interface OpcionCatalogo {
  id: number | string
  nombre: string
}

/**
 * Opciones de `Select` a partir de un catálogo. Los hijos conservan la forma `[nombre, ' ']` porque varios
 * `filterOption` heredados leen `option.props.children[0]`. Clave estable por `id` (antes `Math.random()`, F8).
 */
export const mapeoOpciones = (lista: OpcionCatalogo[]) =>
  lista.map(item => (
    <Option value={item.id} key={item.id}>
      {item.nombre}{' '}
    </Option>
  ))

/** Igual que `mapeoOpciones` (se conserva por compatibilidad con los consumidores existentes). */
export const mapeoOpciones2 = mapeoOpciones

/** `1234.5` → `"$ 1,234.50"`. Acepta números o cadenas numéricas (columnas `numeric`). */
export const formatoMonedaMexico = (numero: number | string | undefined | null): string => {
  const redondeado = Number.parseFloat(String(numero)).toFixed(2)
  const partes = redondeado.split('.')
  partes[0] = partes[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  return `$ ${partes[1] ? partes.join('.') : partes[0]}`
}

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * `filterOption` de `Select` que ignora acentos y mayúsculas. Devuelve `false` si la opción no tiene `label`.
 */
export function normalizeAndFilterOptions(entrada: string, opcion?: { label?: unknown }): boolean {
  if (typeof opcion?.label !== 'string') return false
  return sinAcentos(opcion.label).toLowerCase().includes(sinAcentos(entrada).toLowerCase())
}

/**
 * `filterOption` de `Select` con búsqueda: compara, sin acentos ni mayúsculas, con el texto de la opción.
 * rc-select entrega la opción como datos (`{ value, children }` con `<Option>` o `{ value, label }` con `options`),
 * no como elemento React: el heredado `option.props.children[0]` lanzaba `TypeError` al escribir. `mapeoOpciones`
 * deja los hijos como `[nombre, ' ']`, de ahí que se tome el primero si es un arreglo.
 */
export function filtrarOpcion(
  entrada: string,
  opcion?: { children?: unknown; label?: unknown },
): boolean {
  const hijos = opcion?.children
  const texto: unknown = Array.isArray(hijos) ? hijos[0] : (hijos ?? opcion?.label)
  return (
    typeof texto === 'string' &&
    sinAcentos(texto).toLowerCase().includes(sinAcentos(entrada).toLowerCase())
  )
}

/**
 * Id de un valor de `Select` con `labelInValue`. Desde antd 5 el valor es `{ value, label }` (en antd 4 era
 * `{ key, value, label }`): leer `.key` enviaba `undefined` al API. Se acepta `key` por compatibilidad.
 */
export const idDeEtiquetado = (
  valor?: { value?: Key; key?: Key; label?: ReactNode } | null,
): Key | undefined => valor?.value ?? valor?.key
