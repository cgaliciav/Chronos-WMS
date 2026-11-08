import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { renderizar } from './renderizar'

/**
 * Renderiza `ui` en `ruta` dentro de un router en memoria; las demás rutas muestran su propio nombre para poder
 * comprobar redirecciones (`/auth/401` → texto "ruta:/auth/401").
 */
export function renderizarEnRuta(ui: ReactElement, ruta = '/inicio', patron = ruta.split('?')[0]) {
  const router = createMemoryRouter(
    [
      { path: patron, element: ui },
      { path: '*', element: <Ubicacion /> },
    ],
    { initialEntries: [ruta] },
  )
  return { ...renderizar(<RouterProvider router={router} />), router }
}

function Ubicacion() {
  return <span>{`ruta:${window.location.hash || globalThis.location?.pathname}`}</span>
}
