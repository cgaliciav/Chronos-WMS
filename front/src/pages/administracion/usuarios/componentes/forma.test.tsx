import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { http, HttpResponse } from 'msw'
import { renderizar } from 'test/renderizar'
import { API, servidor } from 'test/servidor'
import type { ValoresFormaUsuario } from '../../tipos'
import FormaUsuario from './forma'

describe('FormaUsuario · visibilidad (plan 04, decisión 21)', () => {
  const valores: ValoresFormaUsuario = {
    nombre: 'Usuario de prueba',
    correo: 'usuario@pruebas.local',
    fechaVencimiento: dayjs('2099-12-31'),
    perfil: 'visita',
    areas: [1],
    bodegas: [1],
    proyectosInternos: [1],
    proyectosExternos: [],
  }

  const pintar = (extra: Partial<ValoresFormaUsuario>) => {
    const handleFinish = vi.fn()
    const lista = (recurso: string, nombre: string) =>
      http.get(`${API}/${recurso}/list-names`, () => HttpResponse.json([{ id: 1, nombre }]))
    servidor.use(
      lista('role', 'ROL'),
      lista('warehouse', 'ALMACEN'),
      lista('project', 'PROYECTO'),
      lista('area', 'AREA'),
    )
    renderizar(
      <FormaUsuario
        valores={{ ...valores, ...extra }}
        guardando={false}
        habilitado
        handleFinish={handleFinish}
      />,
    )
    return handleFinish
  }

  const guardar = async () => {
    const boton = screen.getByRole('button', { name: /guardar/i })
    // El formulario se habilita al llegar las listas; el `Spin` que lo cubre tarda un render más en soltar el puntero.
    await waitFor(() => {
      expect(boton).toBeEnabled()
      expect(document.querySelector('.ant-spin-blur')).toBeNull()
    })
    // Sin comprobar `pointer-events`: antd anima la salida del `Spin` y jsdom no la resuelve siempre a tiempo.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(boton)
  }

  it('por defecto envía el modo general', async () => {
    const handleFinish = pintar({})
    expect(await screen.findByText('General: todos los artículos')).toBeInTheDocument()
    await guardar()
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(handleFinish.mock.calls[0][0]).toMatchObject({ modoVisibilidad: 'general' })
  })

  it('muestra y envía el modo del usuario que se edita', async () => {
    const handleFinish = pintar({ modoVisibilidad: 'produccion' })
    expect(
      await screen.findByText('Producción exclusiva: solo los de sus proyectos'),
    ).toBeInTheDocument()
    await guardar()
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(handleFinish.mock.calls[0][0]).toMatchObject({ modoVisibilidad: 'produccion' })
  })

  it('muestra y envía el perfil; ya no hay selector de roles (decisión 22)', async () => {
    const handleFinish = pintar({ perfil: 'encargado-produccion' })
    expect(await screen.findByText('Encargado de Producción')).toBeInTheDocument()
    expect(screen.queryByText('Roles')).toBeNull()
    await guardar()
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(handleFinish.mock.calls[0][0]).toMatchObject({ perfil: 'encargado-produccion' })
  })

  it('sin perfil no guarda', async () => {
    const handleFinish = pintar({ perfil: undefined })
    await guardar()
    expect(await screen.findByText('Indica el perfil del usuario')).toBeInTheDocument()
    expect(handleFinish).not.toHaveBeenCalled()
  })

  it('un usuario sin correo no pide correo, perfil ni visibilidad (decisión 23)', async () => {
    const handleFinish = pintar({ sinCorreo: true, correo: undefined, perfil: undefined })
    await waitFor(() => expect(screen.queryByPlaceholderText('Correo')).toBeNull())
    expect(screen.queryByText('Perfil')).toBeNull()
    expect(screen.queryByText('Visibilidad')).toBeNull()
    await guardar()
    await waitFor(() => expect(handleFinish).toHaveBeenCalledOnce())
    expect(handleFinish.mock.calls[0][0]).toMatchObject({ sinCorreo: true })
  })

  it('al marcar "Sin correo" desaparece el campo del correo', async () => {
    pintar({})
    expect(await screen.findByPlaceholderText('Correo')).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.ant-spin-blur')).toBeNull())
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.queryByPlaceholderText('Correo')).toBeNull())
  })
})
