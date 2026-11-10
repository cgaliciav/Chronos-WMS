import { Card, type CardProps } from 'antd'

/**
 * Tarjeta de sección de página: antd `Card` con la separación inferior que daba la clase `card` de la
 * plantilla. Sustituye a `<div className="card"><div className="card-header">…</div><div className="card-body">`
 * (`title` = contenido del antiguo `card-header`). El título puede ocupar varias líneas, como aquel encabezado
 * (en `Card` es de una sola línea con elipsis).
 */
export default function Tarjeta({ style, styles, ...props }: CardProps) {
  const estilos = typeof styles === 'object' && styles !== null ? styles : {}
  return (
    <Card
      {...props}
      style={{ marginBottom: 12, ...style }}
      styles={{
        ...estilos,
        title: { whiteSpace: 'normal', overflow: 'visible', ...estilos.title },
      }}
    />
  )
}
