// antd 6 inyecta sus estilos (CSS-in-JS) con el tema de `tema.ts`; aquí van su reset y los pocos estilos globales.
import 'antd/dist/reset.css'
import './estilos-globales.css'

import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { App, Button, ConfigProvider, Result } from 'antd'
import esES from 'antd/es/locale/es_ES'
import * as Sentry from '@sentry/react'
import './helpers/fechas'
import { RegistrarFeedback } from './helpers/feedback'
import { router } from './router'
import { configuracionTag, temaConMarca } from './tema'
import { cargarEntorno } from './entorno'
import { iniciarSentry } from './sentry'
import { useUsuarioStore } from './stores/usuario.store'
import { iniciarDeteccionViewport } from './stores/ui.store'
import { useMarcaStore } from './stores/marca.store'
import { iniciarRecargaPorChunkPerdido } from './app/actualizacion/recargaPorChunkPerdido'

// Sentry se inicia sin bloquear el render: el entorno y el cliente llegan de /entorno.json (nunca rechaza).
void cargarEntorno().then(iniciarSentry)
iniciarDeteccionViewport()
iniciarRecargaPorChunkPerdido()
// Con token guardado, recupera la sesión (antes la saga LOAD_CURRENT_ACCOUNT).
void useUsuarioStore.getState().cargarCuentaActual()

function ErrorGeneral() {
  return (
    <Result
      status="500"
      title="Error"
      subTitle="Ups... hubo un error en la aplicación. Vuelve a entrar o comunícate con tu administrador."
      extra={
        <Button type="primary" href="/">
          Inicio
        </Button>
      }
    />
  )
}

/** ConfigProvider con el tema de la marca del cliente (cambia si se recarga la marca). */
function Aplicacion() {
  const temaMarca = useMarcaStore(estado => estado.marca.tema)
  return (
    <ConfigProvider locale={esES} theme={temaConMarca(temaMarca)} tag={configuracionTag}>
      <App>
        <RegistrarFeedback />
        <RouterProvider router={router} />
      </App>
    </ConfigProvider>
  )
}

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No existe el elemento #root en index.html')

// La marca (GET /config/public) se carga antes del primer render; mientras, se ve el cargador de index.html. Si el
// API falla, la app arranca con la marca por defecto de Chronos WMS (plan 03, fase 3).
void useMarcaStore
  .getState()
  .cargar()
  .finally(() => {
    createRoot(raiz).render(
      <Sentry.ErrorBoundary fallback={<ErrorGeneral />}>
        <Aplicacion />
      </Sentry.ErrorBoundary>,
    )
  })
