import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API, servidor } from 'test/servidor'
import { renderizarEnRuta } from 'test/conRouter'
import { notification } from 'helpers/feedback'
import { MARCA_POR_DEFECTO } from 'app/marca'
import { REGIONAL_POR_DEFECTO } from 'stores/marca.store'
import { useUsuarioStore } from 'stores/usuario.store'
import Configuracion from '.'
import { correoParaGuardar } from './componentes/TabCorreo'

const CORREO_GUARDADO = {
  transporte: {
    host: 'smtp.x.io',
    puerto: 587,
    seguro: false,
    usuario: 'u',
    cabeceras: { 'X-S': 'o' },
    tieneContrasena: true,
  },
  remitente: { nombre: 'Demo' },
  plantillas: {},
}

const todas = (version = 3) => ({
  marca: { valor: MARCA_POR_DEFECTO, version },
  correo: { valor: CORREO_GUARDADO, version: 1 },
  reportes: { valor: {}, version: 1 },
  regional: { valor: REGIONAL_POR_DEFECTO, version: 1 },
})

describe('pantalla de configuración (plan 03, fase 4)', () => {
  beforeEach(() => {
    useUsuarioStore.setState({ autorizado: true, permisos: ['CONFIGURACION-EDITAR'] })
    vi.spyOn(notification, 'success').mockImplementation(() => {})
    vi.spyOn(notification, 'warning').mockImplementation(() => {})
    vi.spyOn(notification, 'error').mockImplementation(() => {})
  })

  it('guarda la marca con su versión y los colores en #RRGGBB', async () => {
    let cuerpo:
      { version: number; valor: { nombreApp: string; tema: { colorPrimario: string } } } | undefined
    servidor.use(
      http.get(`${API}/config/`, () => HttpResponse.json(todas())),
      http.put(`${API}/config/marca`, async ({ request }) => {
        cuerpo = (await request.json()) as typeof cuerpo
        return HttpResponse.json({ valor: cuerpo?.valor, version: 4 })
      }),
    )
    renderizarEnRuta(<Configuracion />, '/configuracion')
    const nombre = await screen.findByLabelText('Nombre de la aplicación')
    await userEvent.clear(nombre)
    await userEvent.type(nombre, 'Almacén Demo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar marca' }))
    await waitFor(() => expect(cuerpo).toBeDefined())
    expect(cuerpo?.version).toBe(3)
    expect(cuerpo?.valor.nombreApp).toBe('Almacén Demo')
    expect(cuerpo?.valor.tema.colorPrimario).toBe('#4b7cf3')
    expect(notification.success).toHaveBeenCalled()
  })

  it('un 409 recarga la sección y avisa; un 400 marca el campo rechazado', async () => {
    let lecturas = 0
    servidor.use(
      http.get(`${API}/config/`, () => {
        lecturas++
        return HttpResponse.json(todas(lecturas === 1 ? 3 : 5))
      }),
      http.put(`${API}/config/marca`, () =>
        HttpResponse.json({ message: 'Otra persona cambió', version: 5 }, { status: 409 }),
      ),
    )
    renderizarEnRuta(<Configuracion />, '/configuracion')
    await screen.findByLabelText('Nombre de la aplicación')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar marca' }))
    await waitFor(() => expect(notification.warning).toHaveBeenCalled())
    await waitFor(() => expect(lecturas).toBeGreaterThanOrEqual(2))

    servidor.use(
      http.put(`${API}/config/marca`, () =>
        HttpResponse.json(
          {
            message: 'Configuración inválida',
            errores: [{ campo: 'soporteCorreo', mensaje: 'Correo no válido (API)' }],
          },
          { status: 400 },
        ),
      ),
    )
    // Regex: en jsdom el icono de "cargando" se queda en su animación de salida y cambia el nombre accesible
    await userEvent.click(await screen.findByRole('button', { name: /Guardar marca/ }))
    expect(await screen.findByText('Correo no válido (API)')).toBeInTheDocument()
  })

  it('importar envía el JSON al API y vuelve a leer la configuración', async () => {
    let importado: unknown
    let lecturas = 0
    servidor.use(
      http.get(`${API}/config/`, () => {
        lecturas++
        return HttpResponse.json(todas())
      }),
      http.post(`${API}/config/import`, async ({ request }) => {
        importado = await request.json()
        return HttpResponse.json({ importadas: ['marca'], imagenes: [] })
      }),
    )
    const { container } = renderizarEnRuta(<Configuracion />, '/configuracion')
    await screen.findByLabelText('Nombre de la aplicación')
    const exportacion = {
      formato: 'chronos-wms-config',
      version: 1,
      secciones: { marca: MARCA_POR_DEFECTO },
    }
    const archivo = new File([JSON.stringify(exportacion)], 'config.json', {
      type: 'application/json',
    })
    const entrada = container.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]')
    expect(entrada).not.toBeNull()
    await userEvent.upload(entrada as HTMLInputElement, archivo)
    await waitFor(() => expect(importado).toEqual(exportacion))
    await waitFor(() => expect(notification.success).toHaveBeenCalled())
    await waitFor(() => expect(lecturas).toBeGreaterThanOrEqual(2))
  })

  it('sin el rol no se muestra (ACL)', () => {
    useUsuarioStore.setState({ permisos: ['GRUPOS-LISTADETALLE'] })
    renderizarEnRuta(<Configuracion />, '/configuracion')
    expect(screen.queryByText('Configuración del sistema')).toBeNull()
  })
})

describe('correoParaGuardar: la contraseña es solo de escritura', () => {
  const base = {
    usarTransporte: true,
    transporte: {
      host: 'smtp.x.io',
      puerto: 587,
      seguro: false,
      usuario: 'u',
      contrasena: '',
      borrarContrasena: false,
    },
    remitente: { nombre: 'Demo', correo: '' },
    plantillas: {
      alerta: { asunto: 'A', cuerpo: '' },
      nuevoUsuario: { asunto: 'Hola {{correo}}', cuerpo: 'Clave {{clave}}' },
    },
  }

  it('vacía se omite (se conserva), con texto se envía, "borrar" envía null; conserva cabeceras', () => {
    const conservar = correoParaGuardar(base, CORREO_GUARDADO)
    expect(conservar.transporte).toEqual({
      host: 'smtp.x.io',
      puerto: 587,
      seguro: false,
      usuario: 'u',
      cabeceras: { 'X-S': 'o' },
    })
    expect(
      correoParaGuardar(
        { ...base, transporte: { ...base.transporte, contrasena: 'Nueva' } },
        CORREO_GUARDADO,
      ).transporte,
    ).toMatchObject({ contrasena: 'Nueva' })
    expect(
      correoParaGuardar(
        { ...base, transporte: { ...base.transporte, borrarContrasena: true } },
        CORREO_GUARDADO,
      ).transporte,
    ).toMatchObject({ contrasena: null })
  })

  it('sin servidor propio el transporte es null; solo se envían plantillas completas', () => {
    const r = correoParaGuardar({ ...base, usarTransporte: false }, CORREO_GUARDADO)
    expect(r.transporte).toBeNull()
    expect(r.remitente).toEqual({ nombre: 'Demo' })
    expect(Object.keys(r.plantillas)).toEqual(['nuevoUsuario'])
  })
})
