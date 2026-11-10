import type { CSSProperties, ReactNode } from 'react'
import { Avatar, Flex, Space, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'

export interface ComentarioProps {
  author?: ReactNode
  datetime?: ReactNode
  content: ReactNode
  actions?: ReactNode[]
  avatar?: ReactNode
  style?: CSSProperties
}

/**
 * Comentario con autor, fecha, contenido y acciones. Sustituye al `Comment` que antd eliminó en la v5
 * (plan 01 fase 4; no se usa `@ant-design/compatible`).
 */
export default function Comentario({
  author,
  datetime,
  content,
  actions,
  avatar,
  style,
}: ComentarioProps) {
  return (
    <Flex gap={6} align="flex-start" style={{ padding: '6px 0', ...style }}>
      {avatar ?? <Avatar size="small" icon={<UserOutlined />} />}
      <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Space size={8} wrap>
          {author ? <Typography.Text strong>{author}</Typography.Text> : null}
          {datetime ? <Typography.Text type="secondary">{datetime}</Typography.Text> : null}
        </Space>
        <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
        {actions?.length ? <Space size={8}>{actions}</Space> : null}
      </Flex>
    </Flex>
  )
}
