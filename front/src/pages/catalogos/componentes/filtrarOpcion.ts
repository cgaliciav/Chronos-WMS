/**
 * `filterOption` de los `Select` con `<Option>` hijos (`mapeoOpciones`): compara el texto de la opción sin
 * distinguir mayúsculas. Sustituye a `option.props.children[0]`, que con antd 6 ya no existe (la opción llega como
 * `{ value, children }`) y rompía el filtro al escribir.
 */
export function filtrarOpcion(entrada: string, opcion?: { children?: unknown }): boolean {
  const hijos = opcion?.children
  // `mapeoOpciones` genera `[nombre, ' ']`; las `<Option>` escritas a mano tienen el texto directamente.
  const texto: unknown = Array.isArray(hijos) ? hijos[0] : hijos
  return typeof texto === 'string' && texto.toLowerCase().includes(entrada.toLowerCase())
}
