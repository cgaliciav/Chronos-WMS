/**
 * `filterOption` de los `Select` de operaciones: compara (sin distinguir mayúsculas) con el texto de la opción.
 * `mapeoOpciones` deja los hijos de cada opción como `[nombre, ' ']` y las opciones con `options` traen `label`;
 * rc-select entrega la opción como datos (`{ value, children }` o `{ value, label }`), no como elemento: el
 * `option.props.children[0]` anterior lanzaba un `TypeError` al escribir en la búsqueda.
 */
export const filtrarOpcion = (
  entrada: string,
  opcion?: { children?: unknown; label?: unknown },
): boolean => {
  const hijos = opcion?.children
  const texto: unknown = Array.isArray(hijos) ? hijos[0] : (hijos ?? opcion?.label)
  return typeof texto === 'string' && texto.toLowerCase().indexOf(entrada.toLowerCase()) >= 0
}
