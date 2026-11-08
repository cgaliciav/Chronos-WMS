/**
 * `filterOption` para `Select` cuyas opciones vienen de `mapeoOpciones` (`helpers/funcionesExtras`): sus hijos son
 * `[nombre, ' ']`. Sustituye al heredado `option.props.children[0]`, que fallaba siempre porque antd entrega los
 * datos de la opción (`{ value, children, … }`), no el elemento React.
 */
export const filtrarPorPrimerHijo = (entrada: string, opcion?: { children?: unknown }): boolean => {
  const hijos = opcion?.children
  const texto: unknown = Array.isArray(hijos) ? (hijos as unknown[])[0] : hijos
  return typeof texto === 'string' && texto.toLowerCase().indexOf(entrada.toLowerCase()) >= 0
}
