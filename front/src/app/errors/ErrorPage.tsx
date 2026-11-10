import { Button, Result } from 'antd'
import { Link } from 'react-router'
import Titulo from 'components/Titulo'

export type CodigoError = 401 | 404 | 500 | 503

const TEXTOS: Record<
  CodigoError,
  { titulo: string; descripcion: string; estado: '403' | '404' | '500' }
> = {
  401: {
    titulo: 'Sin autorización',
    descripcion:
      'No tienes permiso para acceder a la página solicitada. Verifícalo con tu administrador.',
    estado: '403',
  },
  404: {
    titulo: 'Página no encontrada',
    descripcion: 'Esta página fue deshabilitada, borrada o nunca ha existido.',
    estado: '404',
  },
  500: {
    titulo: 'Error del servidor',
    descripcion:
      'Esta página presenta un error de servidor; reintenta más tarde o comunícate con tu administrador.',
    estado: '500',
  },
  503: {
    titulo: 'Error en la aplicación',
    descripcion:
      'Ups... hubo un error en la aplicación; vuelve a entrar o comunícate con tu administrador.',
    estado: '500',
  },
}

/** Páginas de error 401/404/500/503 con antd `Result` (sustituye a `cleanui/system/Errors`). */
export default function ErrorPage({ code }: { code: CodigoError }) {
  const { titulo, descripcion, estado } = TEXTOS[code]
  return (
    <>
      <Titulo texto={`Error ${code}`} />
      <Result
        status={estado}
        title={`${code} · ${titulo}`}
        subTitle={descripcion}
        extra={
          <Link to="/">
            <Button type="primary">Inicio</Button>
          </Link>
        }
      />
    </>
  )
}
