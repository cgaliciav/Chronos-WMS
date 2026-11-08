// antd 6 inyecta sus estilos (CSS-in-JS) con el tema de `tema.ts`; aquí van el reset y los estilos heredados.
import 'antd/dist/reset.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-perfect-scrollbar/dist/css/styles.css'
import './global.scss' // estilos de la plantilla aún en uso (se retiran en la fase 6)
import './styles/layout-plantilla.css'

import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { App, Button, ConfigProvider, Result } from 'antd'
import esES from 'antd/es/locale/es_ES'
import * as Sentry from '@sentry/react'
import './helpers/fechas'
import { RegistrarFeedback } from './helpers/feedback'
import { router } from './router'
import { configuracionTag, tema } from './tema'
import { iniciarSentry } from './sentry'
import { useUsuarioStore } from './stores/usuario.store'
import { iniciarDeteccionViewport } from './stores/ui.store'

iniciarSentry()
iniciarDeteccionViewport()
// Con token guardado, recupera la sesión (antes la saga LOAD_CURRENT_ACCOUNT).
void useUsuarioStore.getState().cargarCuentaActual()

function ErrorGeneral() {
  return (
    <Result
      status="500"
      title="Error"
      subTitle="Ups... hubo un error en la aplicación. Vuelve a entrar o comunícate con tu administrador."
      extra={
        <Button type="primary" href="#/">
          Inicio
        </Button>
      }
    />
  )
}

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No existe el elemento #root en index.html')

createRoot(raiz).render(
  <Sentry.ErrorBoundary fallback={<ErrorGeneral />}>
    <ConfigProvider locale={esES} theme={tema} tag={configuracionTag}>
      <App>
        <RegistrarFeedback />
        <RouterProvider router={router} />
      </App>
    </ConfigProvider>
  </Sentry.ErrorBoundary>,
)
