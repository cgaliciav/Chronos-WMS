import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { SESION_VACIA, useUsuarioStore } from 'stores/usuario.store'
import { renderizarEnRuta } from 'test/conRouter'
import { API, servidor } from 'test/servidor'
import NombreListado from './nombreListado'
import { ModalMoverMovimiento } from './moverMovimiento'

const comoUsuario = (permisos: string[]) =>
  useUsuarioStore.setState({ ...SESION_VACIA, autorizado: true, permisos })

describe('NombreListado (decisión 24)', () => {
  beforeEach(() => comoUsuario(['ADMINISTRADOR']))

  it('quien no es administrador ve el nombre sin el botón de editar', () => {
    comoUsuario(['GRUPOS-EDITAR', 'COMPRAS-OPERACION'])
    renderizarEnRuta(<NombreListado grupoId={5} nombre="PRÉSTAMO 1" alRenombrar={vi.fn()} />)
    expect(screen.getByText('PRÉSTAMO 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cambiar el nombre/i })).toBeNull()
  })

  it('el administrador cambia el nombre y se recarga el listado', async () => {
    const cuerpos: unknown[] = []
    servidor.use(
      http.put(`${API}/groups/rename`, async ({ request }) => {
        cuerpos.push(await request.json())
        return HttpResponse.json({ id: 5, nombre: 'PRÉSTAMO NUEVO' })
      }),
    )
    const alRenombrar = vi.fn()
    const usuario = userEvent.setup()
    renderizarEnRuta(<NombreListado grupoId={5} nombre="PRÉSTAMO 1" alRenombrar={alRenombrar} />)
    await usuario.click(screen.getByRole('button', { name: /cambiar el nombre/i }))
    const campo = await screen.findByDisplayValue('PRÉSTAMO 1')
    await usuario.clear(campo)
    await usuario.type(campo, '  PRÉSTAMO NUEVO ')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(alRenombrar).toHaveBeenCalledOnce())
    expect(cuerpos).toEqual([{ grupoId: 5, nombre: 'PRÉSTAMO NUEVO' }])
  })

  it('no envía un nombre de menos de 3 caracteres', async () => {
    const alRenombrar = vi.fn()
    const usuario = userEvent.setup()
    renderizarEnRuta(<NombreListado grupoId={5} nombre="PRÉSTAMO 1" alRenombrar={alRenombrar} />)
    await usuario.click(screen.getByRole('button', { name: /cambiar el nombre/i }))
    const campo = await screen.findByDisplayValue('PRÉSTAMO 1')
    await usuario.clear(campo)
    await usuario.type(campo, 'ab')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(
      await screen.findByText('El nombre debe tener al menos 3 caracteres'),
    ).toBeInTheDocument()
    expect(alRenombrar).not.toHaveBeenCalled()
  })
})

describe('ModalMoverMovimiento (decisión 25)', () => {
  const listado = (id: number, nombre: string, estatus = 'activo') => ({
    id,
    nombre,
    estatus,
    fecha: '2026-11-01T10:00:00.000Z',
    movimientosTotales: 2,
    grupoDetalle: {
      id,
      movimientoTipo: { id: 3, nombre: 'PRÉSTAMO' },
      proyecto: { id: 2, nombre: 'PROYECTO B' },
      usuarios: [{ id: 9, nombre: 'Responsable Nueve' }],
    },
  })

  it('lista los listados del mismo tipo y mueve el movimiento al elegido', async () => {
    const pedidos: unknown[] = []
    const movidos: unknown[] = []
    servidor.use(
      http.post(`${API}/groups/list-by-group-antd`, async ({ request }) => {
        pedidos.push(await request.json())
        return HttpResponse.json({
          results: [
            listado(10, 'ORIGEN'),
            listado(11, 'DESTINO'),
            listado(12, 'CERRADO', 'inactivo'),
          ],
          filtered: 3,
          pagination: { current: 1, pageSize: 10, total: 3, totalItems: 3 },
        })
      }),
      http.put(`${API}/groups/activity-move`, async ({ request }) => {
        movidos.push(await request.json())
        return HttpResponse.json({ movimientoId: 77, grupoDestinoId: 11, proyectoCambiado: true })
      }),
    )
    const alMover = vi.fn()
    const alCerrar = vi.fn()
    const usuario = userEvent.setup({ pointerEventsCheck: 0 })
    renderizarEnRuta(
      <ModalMoverMovimiento
        movimientoId={77}
        grupoOrigenId={10}
        movimientoTipoId={3}
        alCerrar={alCerrar}
        alMover={alMover}
      />,
    )
    expect(await screen.findByText('DESTINO')).toBeInTheDocument()
    expect(pedidos[0]).toMatchObject({ movimientoTipoId: 3 })
    // el listado actual y los no activos no se pueden elegir
    expect(screen.getByText('Listado actual')).toBeInTheDocument()
    expect(screen.getByText('No activo')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Mover aquí' })).toHaveLength(1)
    expect(screen.getAllByText('Responsable Nueve').length).toBeGreaterThan(0)

    await usuario.click(screen.getByRole('button', { name: 'Mover aquí' }))
    await usuario.click(await screen.findByRole('button', { name: 'Sí, mover' }))
    await waitFor(() => expect(alMover).toHaveBeenCalledOnce())
    expect(movidos).toEqual([{ movimientoId: 77, grupoOrigenId: 10, grupoDestinoId: 11 }])
    expect(alCerrar).toHaveBeenCalled()
  })

  it('cerrada no pide nada', () => {
    const peticion = vi.fn(() => HttpResponse.json({ results: [], filtered: 0, pagination: {} }))
    servidor.use(http.post(`${API}/groups/list-by-group-antd`, peticion))
    renderizarEnRuta(
      <ModalMoverMovimiento
        movimientoId={null}
        grupoOrigenId={10}
        movimientoTipoId={3}
        alCerrar={vi.fn()}
        alMover={vi.fn()}
      />,
    )
    expect(peticion).not.toHaveBeenCalled()
  })
})
