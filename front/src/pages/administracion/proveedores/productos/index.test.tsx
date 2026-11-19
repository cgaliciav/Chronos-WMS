import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { SESION_VACIA, useUsuarioStore } from 'stores/usuario.store'
import { renderizarEnRuta } from 'test/conRouter'
import { API, servidor } from 'test/servidor'
import ProductosPorProveedor from './index'

describe('Productos por proveedor (decisión 26)', () => {
  const listados: unknown[] = []
  const reportes: unknown[] = []

  beforeEach(() => {
    listados.length = 0
    reportes.length = 0
    useUsuarioStore.setState({ ...SESION_VACIA, autorizado: true, permisos: ['ADMINISTRADOR'] })
    servidor.use(
      http.get(`${API}/supplier/list-names`, () =>
        HttpResponse.json([{ id: 4, nombre: 'PROVEEDOR CUATRO' }]),
      ),
      http.get(`${API}/project/list-names`, () =>
        HttpResponse.json([{ id: 2, nombre: 'PROYECTO B' }]),
      ),
      http.post(`${API}/groups/list-by-supplier-antd`, async ({ request }) => {
        listados.push(await request.json())
        return HttpResponse.json({
          results: [
            {
              id: 31,
              cantidad: 2,
              estatus: 'activo',
              fecha: '2026-11-10T12:00:00.000Z',
              grupos: [{ id: 8, nombre: 'FACTURA 8' }],
              operacion: {
                id: 1,
                movimientoTipo: { id: 15, nombre: 'COMPRA' },
                proyecto: { id: 2, nombre: 'PROYECTO B' },
              },
              inventarioActual: {
                id: 77,
                bodega: { id: 1, nombre: 'PRINCIPAL' },
                producto: {
                  id: 5,
                  titulo: 'SILLA PLEGABLE',
                  productoClaves: [{ id: 1, barras: '0000001234' }],
                  productoPrecios: [
                    { id: 1, precio: 250, precioTipo: { id: 2, nombre: 'COMPRA' } },
                  ],
                },
              },
            },
          ],
          filtered: 1,
          pagination: { current: 1, pageSize: 20, total: 1, totalItems: 1 },
        })
      }),
      http.post(`${API}/reports/by-supplier`, async ({ request }) => {
        reportes.push(await request.json())
        return HttpResponse.json({ message: 'El reporte se está generando' })
      }),
    )
  })

  it('con el proveedor en la URL lista sus productos y pide el Excel de lo mismo', async () => {
    const usuario = userEvent.setup({ pointerEventsCheck: 0 })
    renderizarEnRuta(<ProductosPorProveedor />, '/proveedores/productos?uid=4')

    expect(await screen.findByText('SILLA PLEGABLE')).toBeInTheDocument()
    expect(screen.getByText('Productos de PROVEEDOR CUATRO')).toBeInTheDocument()
    expect(screen.getByText('FACTURA 8')).toBeInTheDocument()
    expect(listados[0]).toMatchObject({ proveedorId: 4 })
    expect((listados[0] as { proyectoId?: number }).proyectoId).toBeUndefined()

    await usuario.hover(screen.getByRole('button', { name: /Reportes/ }))
    await usuario.click(await screen.findByText('Excel sin foto'))
    await waitFor(() => expect(reportes).toHaveLength(1))
    expect(reportes[0]).toMatchObject({
      proveedorId: 4,
      conFoto: false,
      sortField: 'movimiento.id',
    })
  })

  it('sin proveedor elegido no pide nada y el Excel está deshabilitado', async () => {
    renderizarEnRuta(<ProductosPorProveedor />, '/proveedores/productos')
    expect(await screen.findByText('Selecciona un proveedor y pulsa Buscar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reportes/ })).toBeDisabled()
    expect(listados).toHaveLength(0)
  })
})
