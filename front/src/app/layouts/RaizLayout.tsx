import { useEffect, useLayoutEffect, type ComponentType, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useMarcaStore } from 'stores/marca.store'
import { useUsuarioStore } from 'stores/usuario.store'
import AuthLayout from './AuthLayout'
import { RUTA_CAMBIO_PASSWORD } from 'app/auth/rutas'
import MainLayout from './MainLayout'

export type TipoLayout = 'public' | 'auth' | 'main'

const PublicLayout = ({ children }: { children: ReactNode }) => <>{children}</>

const LAYOUTS: Record<TipoLayout, ComponentType<{ children: ReactNode }>> = {
  public: PublicLayout,
  auth: AuthLayout,
  main: MainLayout,
}

/** Layout según la ruta: `/` público, `/auth/*` autenticación, el resto principal. */
export function tipoDeLayout(pathname: string): TipoLayout {
  if (pathname === '/') return 'public'
  if (/^\/auth(?=\/|$)/i.test(pathname)) return 'auth'
  return 'main'
}

/** Elemento raíz del router: elige layout, protege las rutas privadas y recuerda la última ruta visitada. */
export default function RaizLayout() {
  const { pathname, search } = useLocation()
  const autorizado = useUsuarioStore(estado => estado.autorizado)
  const cargando = useUsuarioStore(estado => estado.cargando)
  const cambioPasswordPendiente = useUsuarioStore(estado => estado.cambioPasswordPendiente)
  const nombreCorto = useMarcaStore(estado => estado.marca.nombreCorto)
  const marcaCargada = useMarcaStore(estado => estado.cargada)

  // Título por defecto; efecto de layout para que lo sobrescriba el <Titulo> de la página (efecto normal).
  useLayoutEffect(() => {
    document.title = nombreCorto
  }, [pathname, nombreCorto])

  // Si la marca no se pudo cargar al arrancar (API caído), se reintenta en la siguiente navegación.
  useEffect(() => {
    if (!marcaCargada) void useMarcaStore.getState().cargar()
  }, [pathname, marcaCargada])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!pathname.includes('auth')) localStorage.setItem('ultimaVisitada', pathname + search)
  }, [pathname, search])

  const tipo = tipoDeLayout(pathname)
  const Contenedor = LAYOUTS[tipo]

  // Mientras se comprueba la sesión guardada no se muestra nada (ni se manda al login).
  if (cargando && !autorizado && tipo !== 'auth') return null
  if (tipo !== 'auth' && !autorizado) return <Navigate to="/auth/login" replace />
  // Contraseña temporal (L2): el API rechaza todo salvo cambiarla, así que no se muestra otra página.
  if (tipo !== 'auth' && cambioPasswordPendiente)
    return <Navigate to={RUTA_CAMBIO_PASSWORD} replace />

  return (
    <Contenedor>
      <Outlet />
    </Contenedor>
  )
}
