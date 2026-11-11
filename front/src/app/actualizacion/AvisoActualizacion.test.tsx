import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderizar } from 'test/renderizar'
import AvisoActualizacion, {
  INTERVALO_REVISION_MS,
  vigilarActualizaciones,
} from './AvisoActualizacion'

const estado = vi.hoisted(() => ({
  hayVersionNueva: false,
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [estado.hayVersionNueva, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: estado.updateServiceWorker,
  }),
}))

function montar() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <AvisoActualizacion />
            <Outlet />
          </>
        ),
        children: [
          { path: 'uno', element: <p>Página uno</p> },
          { path: 'dos', element: <p>Página dos</p> },
        ],
      },
    ],
    { initialEntries: ['/uno'] },
  )
  renderizar(<RouterProvider router={router} />)
  return router
}

describe('AvisoActualizacion', () => {
  beforeEach(() => {
    estado.hayVersionNueva = false
    estado.updateServiceWorker.mockClear()
  })

  it('sin versión nueva no avisa', async () => {
    montar()
    expect(await screen.findByText('Página uno')).toBeInTheDocument()
    expect(screen.queryByText('Hay una versión nueva')).not.toBeInTheDocument()
  })

  it('con versión nueva avisa y "Actualizar" activa el service worker nuevo', async () => {
    estado.hayVersionNueva = true
    montar()
    expect(await screen.findByText('Hay una versión nueva')).toBeInTheDocument()
    expect(estado.updateServiceWorker).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(estado.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('si se ignora el aviso, se actualiza al cambiar de ruta', async () => {
    estado.hayVersionNueva = true
    const router = montar()
    await screen.findByText('Hay una versión nueva')
    expect(estado.updateServiceWorker).not.toHaveBeenCalled()
    await act(() => router.navigate('/dos'))
    expect(estado.updateServiceWorker).toHaveBeenCalledWith(true)
  })
})

describe('vigilarActualizaciones', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('revisa el service worker cada intervalo y al volver a la pestaña', () => {
    vi.useFakeTimers()
    const update = vi.fn(() => Promise.resolve())
    const registro = { installing: null, update } as unknown as ServiceWorkerRegistration
    const detener = vigilarActualizaciones(registro)

    vi.advanceTimersByTime(INTERVALO_REVISION_MS)
    expect(update).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).toHaveBeenCalledTimes(2)

    detener()
    vi.advanceTimersByTime(INTERVALO_REVISION_MS)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).toHaveBeenCalledTimes(2)
  })
})
