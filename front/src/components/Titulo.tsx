import { useEffect } from 'react'

export const PREFIJO_TITULO = 'Sony Almacén'

/**
 * Fija el título de la pestaña (`Sony Almacén | <texto>`). Sustituye a `react-helmet` (plan 01 D12); con
 * React 19 (fase 4) puede pasar a ser un `<title>` nativo sin tocar las páginas.
 */
export default function Titulo({ texto }: { texto?: string }) {
  useEffect(() => {
    document.title = texto ? `${PREFIJO_TITULO} | ${texto}` : `${PREFIJO_TITULO} México Almacén General`
  }, [texto])
  return null
}
