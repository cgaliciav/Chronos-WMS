/**
 * Hasta v4.0.x el front usaba hash routing (`/#/catalogo/general`). Convierte esos enlaces guardados (marcadores,
 * correos, historial) a la ruta equivalente sin `#` antes de crear el router, sin recargar la página.
 * Devuelve la ruta nueva o `null` si no había nada que convertir.
 */
export function convertirEnlaceHash(
  ubicacion: Location = window.location,
  historial: History = window.history,
) {
  const { hash } = ubicacion
  if (!hash.startsWith('#/')) return null
  const ruta = hash.slice(1)
  historial.replaceState(historial.state, '', ruta)
  return ruta
}
