import { useEffect } from 'react'
import { useMarcaStore } from 'stores/marca.store'

/**
 * Fija el título de la pestaña (`<nombreCorto de la marca> | <texto>`). Sustituye a `react-helmet` (plan 01 D12); con
 * React 19 (fase 4) puede pasar a ser un `<title>` nativo sin tocar las páginas.
 */
export default function Titulo({ texto }: { texto?: string }) {
  const prefijo = useMarcaStore(estado => estado.marca.nombreCorto)
  useEffect(() => {
    document.title = texto ? `${prefijo} | ${texto}` : prefijo
  }, [texto, prefijo])
  return null
}
