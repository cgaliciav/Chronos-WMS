import { create } from 'zustand'
import { apiURLBase } from 'services/axios'
import ConfiguracionPeticiones, { type Regional } from 'services/axios/configuracion'
import { MARCA_POR_DEFECTO, type Marca } from 'app/marca'

export const REGIONAL_POR_DEFECTO: Regional = {
  monedaPorDefecto: 'MXN',
  monedas: ['MXN', 'USD'],
  locale: 'es-MX',
  zonaHoraria: 'America/Mexico_City',
}

/** Logo y favicon por defecto (en `public/`) cuando el cliente no subió los suyos. */
export const LOGO_POR_DEFECTO = '/resources/images/logo.svg'
export const FAVICON_POR_DEFECTO = '/favicon.png'

interface EstadoMarca {
  marca: Marca
  regional: Regional
  /** URL absoluta del logo y del favicon (del API o los de `public/`). */
  logo: string
  favicon: string
  /** `true` cuando la marca del API se cargó; si falló se usan los valores por defecto y se reintenta. */
  cargada: boolean
  /** Carga `GET /config/public`. Nunca rechaza: si el API falla quedan los valores de Chronos WMS. */
  cargar: () => Promise<void>
}

const urlDelApi = (ruta: string | null, respaldo: string) =>
  ruta ? `${apiURLBase}${ruta.replace(/^\//, '')}` : respaldo

/** Pone el favicon de la marca en el `<link rel="icon">` de `index.html`. */
export function aplicarFavicon(url: string) {
  const enlace =
    document.querySelector<HTMLLinkElement>('link[rel~="icon"]') ??
    document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }))
  enlace.href = url
}

/** Marca del cliente servida por el API (plan 03, fase 3). */
export const useMarcaStore = create<EstadoMarca>()((set, get) => ({
  marca: MARCA_POR_DEFECTO,
  regional: REGIONAL_POR_DEFECTO,
  logo: LOGO_POR_DEFECTO,
  favicon: FAVICON_POR_DEFECTO,
  cargada: false,
  cargar: async () => {
    try {
      const publica = await ConfiguracionPeticiones.publica()
      const favicon = urlDelApi(publica.faviconUrl, FAVICON_POR_DEFECTO)
      set({
        marca: { ...MARCA_POR_DEFECTO, ...publica.marca },
        regional: publica.regional,
        logo: urlDelApi(publica.logoUrl, LOGO_POR_DEFECTO),
        favicon,
        cargada: true,
      })
      aplicarFavicon(favicon)
    } catch {
      // Sin API: valores por defecto de Chronos WMS (el interceptor ya avisó del error de conexión).
      if (!get().cargada) set({ cargada: false })
    }
  },
}))
