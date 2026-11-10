/**
 * Identidad por defecto del producto (plan 03, fase 0): "Chronos WMS". Ningún texto de marca de un cliente vive en el
 * código; en la fase 3 la marca de cada cliente llega del API (`GET /config/public`) y esto queda como respaldo.
 */
export interface Marca {
  /** Nombre visible (menú, login). */
  nombreApp: string
  /** Prefijo del título de la pestaña. */
  nombreCorto: string
  /** Nombre del cliente que usa la instalación ("" si no se configuró). */
  organizacion: string
  textoBienvenida: string
  textoAyudaLogin: string
  soporteCorreo: string
  soporteTelefono?: string
  avisoPrivacidadUrl?: string
  creditoProveedor: { texto: string; url: string; visible: boolean }
  tema: { colorPrimario: string; colorEnlaceHover: string; fuente: string; radio: number }
}

export const MARCA_POR_DEFECTO: Marca = {
  nombreApp: 'Chronos WMS',
  nombreCorto: 'Chronos WMS',
  organizacion: '',
  textoBienvenida: 'Bienvenido a Chronos WMS',
  textoAyudaLogin:
    'Si no recuerda su acceso, por favor comuníquese con el administrador del sistema',
  soporteCorreo: 'soporte@exogrid.io',
  creditoProveedor: {
    texto: 'EXOGRID TECHNOLOGY',
    url: 'https://exogrid.io/software',
    visible: true,
  },
  tema: { colorPrimario: '#4b7cf3', colorEnlaceHover: '#42baf9', fuente: 'Mukta', radio: 2 },
}
