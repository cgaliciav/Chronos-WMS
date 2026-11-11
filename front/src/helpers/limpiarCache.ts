/** Prefijo de la precache del service worker (workbox): la gestiona él, no se borra a mano. */
const PREFIJO_PRECACHE = 'workbox-precache'
const ESPERA_ACTIVACION_MS = 3000

/**
 * Toma la última versión del front: pide al service worker de la PWA que busque una versión nueva y, si hay una en
 * espera, la activa; borra las demás cachés del navegador (Cache Storage) y recarga la página.
 *
 * No desregistra el service worker ni borra su precache: al recargar en seguida el registro "resucita" y quedaría
 * activo con la precache vacía (sin la protección ante chunks borrados hasta el siguiente despliegue).
 * Sustituye a la dependencia `clear-cache` (su `.d.ts` no compila con TypeScript).
 */
export async function limpiarCache(recargar = true): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registro = await navigator.serviceWorker.getRegistration()
    if (registro) {
      await registro.update().catch(() => {
        // Sin red: se recarga con lo que haya.
      })
      const enEspera = registro.waiting ?? (await esperarInstalacion(registro))
      if (enEspera) await activar(enEspera)
    }
  }
  if ('caches' in window) {
    const nombres = await caches.keys()
    await Promise.all(
      nombres
        .filter(nombre => !nombre.startsWith(PREFIJO_PRECACHE))
        .map(nombre => caches.delete(nombre)),
    )
  }
  if (recargar) window.location.reload()
}

/** Si `update()` encontró un `sw.js` nuevo, espera a que termine de instalarse (queda "en espera"). */
function esperarInstalacion(registro: ServiceWorkerRegistration): Promise<ServiceWorker | null> {
  const instalando = registro.installing
  if (!instalando) return Promise.resolve(null)
  return conLimite(
    new Promise(resolver => {
      instalando.addEventListener('statechange', () => {
        if (instalando.state === 'installed') resolver(registro.waiting)
        if (instalando.state === 'redundant') resolver(null)
      })
    }),
    null,
  )
}

/** Activa el service worker en espera (`SKIP_WAITING`, lo atiende el `sw.js` de workbox) y espera a que controle. */
function activar(enEspera: ServiceWorker): Promise<void> {
  const controlando = new Promise<void>(resolver => {
    navigator.serviceWorker.addEventListener('controllerchange', () => resolver(), { once: true })
  })
  enEspera.postMessage({ type: 'SKIP_WAITING' })
  return conLimite(controlando, undefined)
}

function conLimite<T>(promesa: Promise<T>, siVence: T): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>(resolver => window.setTimeout(() => resolver(siVence), ESPERA_ACTIVACION_MS)),
  ])
}
