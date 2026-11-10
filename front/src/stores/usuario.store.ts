import { create } from 'zustand'
import { notification } from 'helpers/feedback'
import AutorizacionPeticiones from 'services/axios/autorizacion'
import UsuarioPeticiones from 'services/axios/usuarios'
import { borrar, borrarToken, obtenerToken } from 'helpers/storage'
import type { UsuarioActual } from 'types/api'

/** Sesión del usuario (sustituye a `redux/user` y sus sagas). */
export interface EstadoUsuario {
  id: number | ''
  nombre: string
  correo: string
  avatar: string
  /** Códigos de rol (`codigoRol` del API); `ADMINISTRADOR` ve todo. */
  permisos: string[]
  autorizado: boolean
  cargando: boolean
  /** Entró con una contraseña temporal: hasta cambiarla solo se muestra `/auth/cambiar-password` (L2). */
  cambioPasswordPendiente: boolean
  /** Inicia sesión y carga la cuenta; devuelve `true` si todo fue bien. */
  login: (correo: string, contrasena: string) => Promise<boolean>
  cargarCuentaActual: () => Promise<void>
  /** Tras cambiar la contraseña temporal: quita la marca y recarga la cuenta. */
  completarCambioPassword: () => Promise<void>
  /** Cierra la sesión: borra token, última ruta visitada y permisos (corrige F4). */
  logout: () => Promise<void>
}

type DatosSesion = Pick<
  EstadoUsuario,
  | 'id'
  | 'nombre'
  | 'correo'
  | 'avatar'
  | 'permisos'
  | 'autorizado'
  | 'cargando'
  | 'cambioPasswordPendiente'
>

export const SESION_VACIA: DatosSesion = {
  id: '',
  nombre: '',
  correo: '',
  avatar: '',
  permisos: [],
  autorizado: false,
  cargando: false,
  cambioPasswordPendiente: false,
}

export const useUsuarioStore = create<EstadoUsuario>()((set, get) => ({
  ...SESION_VACIA,
  // Con token guardado, la cuenta se carga al arrancar (index.tsx): hasta entonces el layout espera en vez de
  // mandar al login.
  cargando: obtenerToken() !== null,

  login: async (correo, contrasena) => {
    set({ cargando: true })
    try {
      const { cambiarPassword } = await AutorizacionPeticiones.login(correo, contrasena)
      await get().cargarCuentaActual()
      if (!get().autorizado) return false
      if (cambiarPassword) {
        set({ cambioPasswordPendiente: true })
        return true
      }
      notification.success({
        title: '¡Bienvenido!',
        description: 'Has entrado correctamente al Almacén de Sony México',
      })
      return true
    } catch {
      // El interceptor de axios ya mostró el error.
      return false
    } finally {
      set({ cargando: false })
    }
  },

  cargarCuentaActual: async () => {
    if (obtenerToken() === null) {
      set({ cargando: false })
      return
    }
    set({ cargando: true })
    try {
      const cuenta: UsuarioActual | undefined = await UsuarioPeticiones.actual()
      if (cuenta && Array.isArray(cuenta.roles)) {
        set({
          id: cuenta.id,
          nombre: cuenta.nombre,
          correo: cuenta.correo,
          avatar: cuenta.avatar ?? '',
          permisos: [...cuenta.roles],
          autorizado: true,
          cambioPasswordPendiente: cuenta.cambiarPassword === true,
        })
      }
    } catch {
      // Token caducado o API caída: la sesión queda sin autorizar y el layout manda al login.
    } finally {
      set({ cargando: false })
    }
  },

  completarCambioPassword: async () => {
    set({ cambioPasswordPendiente: false })
    await get().cargarCuentaActual()
  },

  logout: async () => {
    try {
      await AutorizacionPeticiones.logout()
    } catch {
      // Aunque el API falle, la sesión local se cierra.
    } finally {
      borrarToken()
      borrar('ultimaVisitada')
      set({ ...SESION_VACIA })
    }
  },
}))

/** ¿El usuario tiene alguno de los roles? (`ADMINISTRADOR` solo cuenta si está en la lista, como en el ACL). */
export function tieneAlgunRol(permisos: string[], roles: string[]): boolean {
  return permisos.some(permiso => roles.includes(permiso))
}
