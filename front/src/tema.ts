import type { ThemeConfig } from 'antd'

/**
 * Tema claro de la app para antd 6 (plan 01 D9/D10). Traslada a tokens las variables LESS que usaba el tema de
 * antd 4 (`styles/antd.less`, antes `kit/vendors/antd/themes/default.less`).
 */
const gris1 = '#f0f2f4'
const gris2 = '#e4e9f0'
const gris4 = '#c8c4db'
const gris6 = '#595c97'
const azul = '#4b7cf3'
const azulClaro = '#42baf9'

export const tema: ThemeConfig = {
  token: {
    colorPrimary: azul,
    colorInfo: azul,
    colorSuccess: '#41b883',
    colorError: '#f5222e',
    colorWarning: '#faad15',
    colorText: gris6,
    colorTextHeading: gris6,
    colorTextLabel: gris6,
    colorTextPlaceholder: '#7578ae',
    colorTextDisabled: gris4,
    colorBgContainerDisabled: gris2,
    colorBorder: gris2,
    colorBorderSecondary: gris2,
    colorLink: azul,
    colorLinkHover: azulClaro,
    colorLinkActive: azulClaro,
    controlItemBgHover: gris2,
    controlItemBgActive: gris2,
    // Fuente y radios de la plantilla (Mukta, esquinas de 2 px como antd 4).
    fontFamily: "'Mukta', sans-serif",
    borderRadius: 2,
    // Espaciado compacto: antd deriva todos los márgenes y rellenos (padding*, margin*) de `sizeUnit` (4 por defecto).
    // Con 2 quedan a la mitad. No cambia la altura de los controles (`controlHeight`).
    sizeUnit: 2,
  },
  components: {
    // Cabecera de 48 px (antd: 64); `Logo` usa la misma altura para alinearse con ella.
    Layout: {
      bodyBg: 'transparent',
      headerBg: 'transparent',
      footerBg: 'transparent',
      headerHeight: 48,
    },
    Table: {
      headerBg: gris1,
      headerColor: gris6,
      footerBg: gris1,
      rowHoverBg: gris2,
      rowSelectedBg: gris1,
    },
    Tabs: {
      itemHoverColor: azulClaro,
      itemActiveColor: azul,
      itemSelectedColor: azul,
      inkBarColor: azul,
    },
    // Menú lateral compacto: 34 px por elemento (32 + 2) en vez de 44 (40 + 4 de antd); el espacio libre alrededor del
    // texto (~22 px) queda en la mitad.
    Menu: { itemHeight: 32, itemMarginBlock: 2 },
    Input: { addonBg: gris1 },
    Form: { labelColor: gris6, labelRequiredMarkColor: '#f5222e' },
  },
}

/**
 * antd 6 quitó el `margin-inline-end: 8px` de `Tag`; se restaura para conservar la separación entre etiquetas
 * contiguas (grupos, claves, estados). Se pasa como prop `tag` de `ConfigProvider`.
 */
export const configuracionTag = { styles: { root: { marginInlineEnd: 8 } } }
