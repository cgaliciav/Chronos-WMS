import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { notification } from 'helpers/feedback'
import { tieneAlgunRol, useUsuarioStore } from 'stores/usuario.store'

export interface ACLProps {
  /** Códigos de rol que dan acceso (`codigoRol` del API). Se pide explícitamente `ADMINISTRADOR` si aplica. */
  roles?: string[]
  /** `true` → navega a `defaultRedirect` si no hay acceso; una ruta → navega a esa ruta. */
  redirect?: boolean | string
  defaultRedirect?: string
  children?: ReactNode
}

/**
 * Muestra `children` solo si el usuario tiene alguno de `roles`; con `redirect`, además avisa y navega.
 * Misma API que el antiguo `components/cleanui/system/ACL` (plan 01 fase 6).
 */
export default function ACL({ roles = [], redirect = false, defaultRedirect = '/auth/401', children }: ACLProps) {
  const permisos = useUsuarioStore(estado => estado.permisos)
  const navigate = useNavigate()
  const autorizado = tieneAlgunRol(permisos, roles)

  useEffect(() => {
    // Como antes: se comprueba al montar (el layout ya esperó a que cargara la sesión).
    if (!autorizado && redirect) {
      notification.error({
        title: 'Sin autorización',
        description: 'No tienes los permisos para acceder a esta página.',
      })
      navigate(typeof redirect === 'string' ? redirect : defaultRedirect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return autorizado ? <>{children}</> : null
}
