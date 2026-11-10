import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { API, servidor } from 'test/servidor'
import { renderizar } from 'test/renderizar'
import { notification } from 'helpers/feedback'
import { MARCA_POR_DEFECTO } from 'app/marca'
import Logo from 'app/layouts/Logo'
import PieDePagina from 'app/layouts/PieDePagina'
import Titulo from 'components/Titulo'
import { temaConMarca } from 'tema'
import { LOGO_POR_DEFECTO, REGIONAL_POR_DEFECTO, useMarcaStore } from './marca.store'

const MARCA_DEMO = {
  ...MARCA_POR_DEFECTO,
  nombreApp: 'Almacén Demo',
  nombreCorto: 'Demo',
  organizacion: 'Demo S.A.',
  soporteCorreo: 'ayuda@demo.mx',
  creditoProveedor: { ...MARCA_POR_DEFECTO.creditoProveedor, visible: false },
  tema: { colorPrimario: '#aa0000', colorEnlaceHover: '#ff5500', fuente: 'Inter', radio: 6 },
}

describe('marca del cliente (plan 03, fase 3)', () => {
  afterEach(() => {
    useMarcaStore.setState({
      marca: MARCA_POR_DEFECTO,
      regional: REGIONAL_POR_DEFECTO,
      logo: LOGO_POR_DEFECTO,
      cargada: false,
    })
  })

  it('carga GET /config/public: nombre, logo y favicon del API, regional', async () => {
    servidor.use(
      http.get(`${API}/config/public`, () =>
        HttpResponse.json({
          marca: MARCA_DEMO,
          regional: { ...REGIONAL_POR_DEFECTO, monedas: ['USD'], monedaPorDefecto: 'USD' },
          logoUrl: '/config/public/logo?v=7',
          faviconUrl: '/config/public/favicon?v=8',
          version: 'x',
        }),
      ),
    )
    await useMarcaStore.getState().cargar()
    const estado = useMarcaStore.getState()
    expect(estado).toMatchObject({
      cargada: true,
      marca: { nombreApp: 'Almacén Demo' },
      regional: { monedaPorDefecto: 'USD' },
    })
    expect(estado.logo).toBe(`${API}/config/public/logo?v=7`)
    expect(document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href).toBe(
      `${API}/config/public/favicon?v=8`,
    )

    renderizar(<Logo />)
    expect(screen.getByText('Almacén Demo')).toBeInTheDocument()
    expect(screen.getByAltText('Almacén Demo')).toHaveAttribute(
      'src',
      `${API}/config/public/logo?v=7`,
    )
  })

  it('con el API caído se queda la marca de Chronos WMS y se marca para reintentar', async () => {
    vi.spyOn(notification, 'error').mockImplementation(() => {})
    servidor.use(http.get(`${API}/config/public`, () => HttpResponse.error()))
    await useMarcaStore.getState().cargar()
    expect(useMarcaStore.getState()).toMatchObject({
      cargada: false,
      marca: { nombreApp: 'Chronos WMS' },
      logo: LOGO_POR_DEFECTO,
    })
  })

  it('pie, título y tema usan la marca', () => {
    useMarcaStore.setState({ marca: MARCA_DEMO })
    renderizar(<PieDePagina />)
    expect(screen.queryByText('EXOGRID TECHNOLOGY')).toBeNull()
    expect(screen.getByText('Soporte técnico').closest('a')).toHaveAttribute(
      'href',
      'mailto:ayuda@demo.mx',
    )

    render(<Titulo texto="Inicio" />)
    expect(document.title).toBe('Demo | Inicio')

    const tema = temaConMarca(MARCA_DEMO.tema)
    expect(tema.token).toMatchObject({
      colorPrimary: '#aa0000',
      colorLinkHover: '#ff5500',
      borderRadius: 6,
      fontFamily: "'Inter', sans-serif",
    })
  })
})
