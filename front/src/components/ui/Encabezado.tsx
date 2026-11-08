import type { ReactNode } from 'react'
import { Flex, Typography } from 'antd'

/**
 * Encabezado de página (sustituye a `<div className="kit__utils__heading"><h5>…</h5></div>`). `extra` se alinea a
 * la derecha (botones o etiquetas que antes iban con `mr-*` dentro del `h5`).
 */
export default function Encabezado({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <Flex align="center" justify="space-between" gap={16} wrap style={{ marginBottom: 20 }}>
      <Typography.Title level={5} style={{ margin: 0 }}>
        {children}
      </Typography.Title>
      {extra}
    </Flex>
  )
}
