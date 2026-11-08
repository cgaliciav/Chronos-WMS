import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { notification } from 'antd'
import { API, USUARIO_PRUEBA, servidor } from 'test/servidor'
import { SESION_VACIA, tieneAlgunRol, useUsuarioStore } from './usuario.store'

describe('usuario.store', () => {
  beforeEach(() => {
    useUsuarioStore.setState({ ...SESION_VACIA })
    vi.spyOn(notification, 'success').mockImplementation(() => {})
    vi.spyOn(notification, 'error').mockImplementation(() => {})
  })

  it('login correcto: guarda el token, carga la cuenta y sus permisos', async () => {
    const correcto = await useUsuarioStore.getState().login('prueba@almacen.mx', 'secreta')

    expect(correcto).toBe(true)
    expect(localStorage.getItem('t')).toBe('token-nuevo')
    const estado = useUsuarioStore.getState()
    expect(estado).toMatchObject({
      autorizado: true,
      cargando: false,
      nombre: USUARIO_PRUEBA.nombre,
      permisos: USUARIO_PRUEBA.roles,
    })
    expect(notification.success).toHaveBeenCalledOnce()
  })

  it('login envía { c, p } sin ip (plan 01 D15)', async () => {
    let cuerpo: unknown
    servidor.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        cuerpo = await request.json()
        return HttpResponse.json({ t: 'token-nuevo' })
      }),
    )
    await useUsuarioStore.getState().login('a@b.mx', 'x')
    expect(cuerpo).toEqual({ c: 'a@b.mx', p: 'x' })
  })

  it('login fallido: devuelve false, no guarda token ni autoriza', async () => {
    servidor.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: 'Credenciales inválidas' }, { status: 401 }),
      ),
    )
    const correcto = await useUsuarioStore.getState().login('prueba@almacen.mx', 'mala')

    expect(correcto).toBe(false)
    expect(localStorage.getItem('t')).toBeNull()
    expect(useUsuarioStore.getState()).toMatchObject({ autorizado: false, cargando: false, permisos: [] })
    expect(notification.error).toHaveBeenCalledWith({ message: 'Credenciales inválidas' })
  })

  it('cargarCuentaActual sin token no llama al API y deja de cargar', async () => {
    useUsuarioStore.setState({ cargando: true })
    await useUsuarioStore.getState().cargarCuentaActual()
    expect(useUsuarioStore.getState()).toMatchObject({ autorizado: false, cargando: false })
    expect(notification.error).not.toHaveBeenCalled()
  })

  it('cargarCuentaActual con token caducado deja la sesión sin autorizar', async () => {
    localStorage.setItem('t', 'caducado')
    servidor.use(
      http.get(`${API}/user/current`, () => HttpResponse.json({ message: 'Token caducado' }, { status: 401 })),
    )
    await useUsuarioStore.getState().cargarCuentaActual()
    expect(useUsuarioStore.getState()).toMatchObject({ autorizado: false, cargando: false })
  })

  it('logout limpia permisos, token y última ruta (corrige F4)', async () => {
    await useUsuarioStore.getState().login('prueba@almacen.mx', 'secreta')
    localStorage.setItem('ultimaVisitada', '/compras/nuevo')

    await useUsuarioStore.getState().logout()

    expect(useUsuarioStore.getState()).toMatchObject({ autorizado: false, permisos: [], nombre: '' })
    expect(localStorage.getItem('t')).toBeNull()
    expect(localStorage.getItem('ultimaVisitada')).toBeNull()
  })

  it('logout cierra la sesión local aunque el API falle', async () => {
    await useUsuarioStore.getState().login('prueba@almacen.mx', 'secreta')
    servidor.use(http.post(`${API}/auth/logout`, () => HttpResponse.json({}, { status: 500 })))

    await useUsuarioStore.getState().logout()

    expect(useUsuarioStore.getState().autorizado).toBe(false)
    expect(localStorage.getItem('t')).toBeNull()
  })

  it('tieneAlgunRol compara contra la lista de roles', () => {
    expect(tieneAlgunRol(['COMPRAS-NUEVO'], ['ADMINISTRADOR', 'COMPRAS-NUEVO'])).toBe(true)
    expect(tieneAlgunRol(['COMPRAS-NUEVO'], ['ADMINISTRADOR'])).toBe(false)
    expect(tieneAlgunRol([], ['ADMINISTRADOR'])).toBe(false)
  })
})
