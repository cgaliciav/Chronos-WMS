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
