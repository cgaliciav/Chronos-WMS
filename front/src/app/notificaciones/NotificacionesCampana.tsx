import { useEffect } from 'react'
import { Badge, Button, Empty, List, Popover, Typography } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { notificacionesActivas, useNotificacionesStore } from 'stores/notificaciones.store'

/** Campana con el número de notificaciones sin leer (sustituye a MagicBell, D14). Oculta si no están activas. */
export default function NotificacionesCampana() {
  const { notificaciones, cargando, cargar, marcarLeida } = useNotificacionesStore()
  const noLeidas = useNotificacionesStore(estado => estado.noLeidas())
  const navigate = useNavigate()

  useEffect(() => {
    if (notificacionesActivas()) void cargar()
  }, [cargar])

  if (!notificacionesActivas()) return null

  const lista = (
    <List
      style={{ width: 320, maxHeight: 400, overflowY: 'auto' }}
      loading={cargando}
      dataSource={notificaciones}
      locale={{ emptyText: <Empty description="No tienes notificaciones" /> }}
      renderItem={n => (
        <List.Item
          style={{ cursor: 'pointer', opacity: n.leida ? 0.6 : 1 }}
          onClick={() => {
            void marcarLeida(n.id)
            if (n.url) navigate(n.url)
          }}
        >
          <List.Item.Meta
            title={n.titulo}
            description={
              <>
                {n.mensaje}
                <Typography.Text type="secondary" style={{ display: 'block' }}>
                  {dayjs(n.fecha).fromNow()}
                </Typography.Text>
              </>
            }
          />
        </List.Item>
      )}
    />
  )

  return (
    <Popover content={lista} title="Notificaciones" trigger="click" placement="bottomRight">
      <Badge count={noLeidas} size="small">
        <Button type="text" icon={<BellOutlined />} aria-label="Notificaciones" />
      </Badge>
    </Popover>
  )
}
