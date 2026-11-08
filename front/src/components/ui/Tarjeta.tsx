import { Card, type CardProps } from 'antd'

/**
 * Tarjeta de sección de página: antd `Card` con la separación inferior que daba la clase `card` de la
 * plantilla. Sustituye a `<div className="card"><div className="card-header">…</div><div className="card-body">`
 * (`title` = contenido del antiguo `card-header`).
 */
export default function Tarjeta({ style, ...props }: CardProps) {
  return <Card {...props} style={{ marginBottom: 24, ...style }} />
}
