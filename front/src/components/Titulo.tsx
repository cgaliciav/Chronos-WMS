import { useEffect } from 'react'
import { MARCA_POR_DEFECTO } from 'app/marca'

export const PREFIJO_TITULO = MARCA_POR_DEFECTO.nombreCorto

/**
 * Fija el título de la pestaña (`<nombreCorto> | <texto>`). Sustituye a `react-helmet` (plan 01 D12); con
 * React 19 (fase 4) puede pasar a ser un `<title>` nativo sin tocar las páginas.
 */
export default function Titulo({ texto }: { texto?: string }) {
  useEffect(() => {
    document.title = texto ? `${PREFIJO_TITULO} | ${texto}` : PREFIJO_TITULO
  }, [texto])
  return null
}
