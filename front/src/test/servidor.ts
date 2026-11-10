import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { UsuarioActual } from 'types/api'

/** Base de las peticiones en pruebas: jsdom corre en http://localhost:3000 y el API vive en /api/. */
export const API = 'http://localhost:3000/api'

export const USUARIO_PRUEBA: UsuarioActual = {
  id: 7,
  nombre: 'Usuario Prueba',
  correo: 'prueba@almacen.mx',
  estatus: 'activo',
  roles: ['V-CATALOGO-GENERAL', 'COMPRAS-NUEVO'],
}

/** Respuestas por defecto (camino feliz); cada prueba puede sobrescribirlas con `servidor.use(...)`. */
export const manejadores = [
  http.post(`${API}/auth/login`, () => HttpResponse.json({ t: 'token-nuevo' })),
  http.post(`${API}/auth/logout`, () => HttpResponse.json({})),
  http.get(`${API}/auth/version`, () => HttpResponse.json({ version: '9.9.9' })),
  http.get(`${API}/notifications/count`, () => HttpResponse.json({ noLeidas: 0 })),
  http.get(`${API}/user/current`, ({ request }) =>
    request.headers.get('auth')
      ? HttpResponse.json(USUARIO_PRUEBA)
      : HttpResponse.json({ message: 'Sin token' }, { status: 401 }),
  ),
]

export const servidor = setupServer(...manejadores)
