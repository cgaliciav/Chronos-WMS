import type { ReactNode } from 'react'
import { Flex, Typography } from 'antd'

/**
 * Título de las tablas de listados y operaciones (`Table title`): nombre a la izquierda y, a la derecha, el total de
 * registros y las acciones (`extra`, p. ej. el menú de reportes), en una sola fila y sin los márgenes de `h2`/`h3`.
 */
export default function EncabezadoTabla({
  titulo,
  total,
  totalItems,
  extra,
}: {
  titulo: ReactNode
  /** Registros tras aplicar los filtros. */
  total?: number
  /** Registros sin filtros; si difiere de `total`, se indica que la lista está filtrada. */
  totalItems?: number
  extra?: ReactNode
}) {
  return (
    <Flex align="center" justify="space-between" gap={8} wrap>
      <Typography.Title level={2} ellipsis style={{ margin: 0, minWidth: 0 }}>
        {titulo}
      </Typography.Title>
      <Flex align="center" gap={8}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          {`TOTAL: ${total || '-'}${total !== totalItems ? ' *filtrado' : ''}`}
        </Typography.Text>
        {extra}
      </Flex>
    </Flex>
  )
}
