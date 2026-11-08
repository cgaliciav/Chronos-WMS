import React, { Fragment, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { notification } from 'helpers/feedback'
import { tieneAlgunRol, useUsuarioStore } from 'stores/usuario.store'

/**
 * Muestra `children` solo si el usuario tiene alguno de `roles`. Con `redirect` (true o una ruta), además
 * notifica y navega a `defaultRedirect` (`/auth/401`) o a la ruta indicada.
 */
const ACL = ({
  redirect = false,
  defaultRedirect = '/auth/401',
  roles = [],
  children,
}) => {
  const permisos = useUsuarioStore(estado => estado.permisos)
  const navigate = useNavigate()
  useEffect(() => {
    const authorized = tieneAlgunRol(permisos, roles)

    if (!authorized && redirect) {
      const url = typeof redirect === 'boolean' ? defaultRedirect : redirect
      notification.error({
        title: 'Sin autorización',
        description: 'No tienes los permisos para acceder a esta página.',
      })
      navigate(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const authorized = tieneAlgunRol(permisos, roles)
  const AuthorizedChildren = () => {
    if (!authorized) {
      return null
    }

    return <Fragment>{children}</Fragment>
  }

  return AuthorizedChildren()
}

export default ACL
