import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { Button } from 'antd'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { notification } from 'helpers/feedback'

/** Cada cuánto se pregunta al servidor si hay un `sw.js` nuevo (además de al volver a la pestaña). */
export const INTERVALO_REVISION_MS = 5 * 60 * 1000
const CLAVE_AVISO = 'version-nueva'

/**
 * Revisa periódicamente y al volver a la pestaña si se desplegó una versión nueva del front. Un `sw.js` distinto
 * deja al service worker nuevo "en espera" y `useRegisterSW` activa `needRefresh`.
 */
export function vigilarActualizaciones(registro: ServiceWorkerRegistration): () => void {
  const revisar = () => {
    if (registro.installing || !navigator.onLine) return
    registro.update().catch(() => {
      // Sin red o servidor caído: se reintenta en la siguiente revisión.
    })
  }
  const alVolver = () => {
    if (document.visibilityState === 'visible') revisar()
  }
  const intervalo = window.setInterval(revisar, INTERVALO_REVISION_MS)
  document.addEventListener('visibilitychange', alVolver)
  return () => {
    window.clearInterval(intervalo)
    document.removeEventListener('visibilitychange', alVolver)
  }
}

/**
 * Aviso de versión nueva del front (PWA). Se monta una vez en `RaizLayout`, dentro del router.
 * - Muestra una notificación fija con el botón "Actualizar" (activa el service worker nuevo y recarga).
 * - Si el usuario la ignora, la versión nueva se aplica en el siguiente cambio de ruta: en ese momento no hay un
 *   formulario a medias que se pueda perder.
 */
export default function AvisoActualizacion() {
  const { pathname } = useLocation()
  const rutaDelAvisoRef = useRef<string | null>(null)
  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (registro) vigilarActualizaciones(registro)
    },
  })

  useEffect(() => {
    if (!hayVersionNueva) {
      rutaDelAvisoRef.current = null
      return
    }
    if (rutaDelAvisoRef.current === null) {
      rutaDelAvisoRef.current = pathname
      notification.open({
        key: CLAVE_AVISO,
        duration: 0,
        placement: 'bottomRight',
        title: 'Hay una versión nueva',
        description: 'Se aplicará al cambiar de página, o puedes aplicarla ahora.',
        actions: (
          <Button type="primary" size="small" onClick={() => void updateServiceWorker(true)}>
            Actualizar
          </Button>
        ),
      })
      return
    }
    if (pathname !== rutaDelAvisoRef.current) void updateServiceWorker(true)
  }, [hayVersionNueva, pathname, updateServiceWorker])

  return null
}
