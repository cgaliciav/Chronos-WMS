import React, { useEffect, useLayoutEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { PREFIJO_TITULO } from 'components/Titulo'
import { useUsuarioStore } from 'stores/usuario.store'
import PublicLayout from './Public'
import AuthLayout from './Auth'
import MainLayout from './Main'

const Layouts = {
  public: PublicLayout,
  auth: AuthLayout,
  main: MainLayout,
}

/** Layout según la ruta: `/` público, `/auth/*` autenticación, el resto principal. */
export function tipoDeLayout(pathname) {
  if (pathname === '/') return 'public'
  if (/^\/auth(?=\/|$)/i.test(pathname)) return 'auth'
  return 'main'
}

/** Elemento raíz del router: elige layout, protege las rutas privadas y recuerda la última ruta visitada. */
const Layout = () => {
  const { pathname, search } = useLocation()
  const autorizado = useUsuarioStore(estado => estado.autorizado)
  const cargando = useUsuarioStore(estado => estado.cargando)

  // Título por defecto. Es un efecto de layout para que lo sobrescriba el <Titulo> de la página (efecto normal).
  useLayoutEffect(() => {
    document.title = `${PREFIJO_TITULO} | Sony México Almacén General`
  }, [pathname])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!pathname.includes('auth')) localStorage.setItem('ultimaVisitada', pathname + search)
  }, [pathname, search])

  const tipo = tipoDeLayout(pathname)
  const Contenedor = Layouts[tipo]

  // Mientras se comprueba la sesión guardada no se muestra nada (ni se manda al login).
  if (cargando && !autorizado && tipo !== 'auth') return null
  if (tipo !== 'auth' && !autorizado) return <Navigate to="/auth/login" replace />

  return (
    <Contenedor>
      <Outlet />
    </Contenedor>
  )
}

export default Layout
