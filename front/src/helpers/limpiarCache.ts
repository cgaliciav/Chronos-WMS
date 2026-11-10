/**
 * Borra las cachés del navegador (Cache Storage) y recarga la página para tomar la última versión del
 * front. Sustituye a la dependencia `clear-cache` (su `.d.ts` no compila con TypeScript).
 */
export async function limpiarCache(recargar = true): Promise<void> {
  if ('caches' in window) {
    const nombres = await caches.keys()
    await Promise.all(nombres.map(nombre => caches.delete(nombre)))
  }
  if (recargar) window.location.reload()
}
