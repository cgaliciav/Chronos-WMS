// Mismo orden de cascada que el build de CRA: antd, Bootstrap, perfect-scrollbar y la plantilla.
import 'antd/lib/style/index.less' // estilos base de antd 4
import './styles/antd.less' // componentes de antd 4 con el tema claro de la app
import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-perfect-scrollbar/dist/css/styles.css'
import './global.scss' // estilos de la plantilla aún en uso (se retiran en las fases 4-6)

import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Button, ConfigProvider, Result } from 'antd'
import esES from 'antd/es/locale/es_ES'
import * as Sentry from '@sentry/react'
import { router } from './router'
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
    <ConfigProvider locale={esES}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </Sentry.ErrorBoundary>,
)
