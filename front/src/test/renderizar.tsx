import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { App, ConfigProvider } from 'antd'
import esES from 'antd/es/locale/es_ES'
import { configuracionTag, tema } from 'tema'

/** Renderiza con el mismo ConfigProvider (locale es_ES y tema) y `<App>` que la aplicación. */
export function renderizar(ui: ReactElement) {
  return render(
    <ConfigProvider locale={esES} theme={tema} tag={configuracionTag}>
      <App>{ui}</App>
    </ConfigProvider>,
  )
}
