import { useMarcaStore } from 'stores/marca.store'

/** Opciones de moneda de la configuración regional del cliente (plan 03, fase 3). */
export const useMonedas = () => {
  const { monedas, monedaPorDefecto } = useMarcaStore(estado => estado.regional)
  return { monedaPorDefecto, opciones: monedas.map(moneda => ({ label: moneda, value: moneda })) }
}

/** Formato de importes en los `InputNumber`: `$ 1,234.5` (separador de miles). */
export const formatearImporte = (valor: string | number | undefined) =>
  `$ ${valor ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** Inversa de `formatearImporte`. */
export const leerImporte = (texto: string | undefined) => (texto ?? '').replace(/\$\s?|(,*)/g, '')
