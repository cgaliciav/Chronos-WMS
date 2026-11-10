import { useEffect } from 'react'
import { Badge, Button, Empty, List, Popover, Typography, theme } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { esRecursoDelApi, urlRecursoDelApi } from 'services/axios/notificaciones'
import { notificacionesActivas, useNotificacionesStore } from 'stores/notificaciones.store'
import type { Notificacion } from 'types/api'

/**
 * Campana con el número de notificaciones sin leer (sustituye a MagicBell, D14). Oculta si no están activas.
 * Recibe las nuevas por SSE (o sondeo cada 60 s) y abre los enlaces del API (reportes) en otra pestaña con el token.
 * Muestra las 50 más recientes (la primera página de `GET /notifications`). Las sin leer llevan fondo, punto azul y
 * título en negrita; las leídas, texto atenuado.
 */
export default function NotificacionesCampana() {
  const { notificaciones, cargando, cargar, marcarLeida, marcarTodas, conectar } =
    useNotificacionesStore()
  const noLeidas = useNotificacionesStore(estado => estado.noLeidas())
  const navigate = useNavigate()
  const { token } = theme.useToken()

  useEffect(() => {
    if (!notificacionesActivas()) return
    void cargar()
    return conectar()
  }, [cargar, conectar])

  if (!notificacionesActivas()) return null

  const abrir = (n: Notificacion) => {
    void marcarLeida(n.id)
    if (!n.url) return
    if (esRecursoDelApi(n.url)) window.open(urlRecursoDelApi(n.url), '_blank', 'noopener')
    else navigate(n.url)
  }

  const lista = (
    <List
      style={{ width: 320, maxHeight: 400, overflowY: 'auto' }}
      loading={cargando}
      dataSource={notificaciones}
      locale={{ emptyText: <Empty description="No tienes notificaciones" /> }}
      split
      renderItem={n => (
        <List.Item
          style={{
            cursor: 'pointer',
            padding: '6px 10px',
            alignItems: 'flex-start',
            gap: 8,
            background: n.leida ? undefined : token.colorPrimaryBg,
          }}
          onClick={() => abrir(n)}
        >
          <span
            aria-label={n.leida ? undefined : 'Sin leer'}
            style={{
              flex: 'none',
              width: 6,
              height: 6,
              marginTop: 6,
              borderRadius: '50%',
              background: n.leida ? 'transparent' : token.colorPrimary,
            }}
          />
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <Typography.Text
                ellipsis
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: n.leida ? 400 : 600,
                  color: n.leida ? token.colorTextSecondary : token.colorText,
                }}
              >
                {n.titulo}
              </Typography.Text>
              <span
                title={dayjs(n.fecha).format('DD/MM/YYYY HH:mm')}
                style={{ flex: 'none', fontSize: 11, color: token.colorTextTertiary }}
              >
                {dayjs(n.fecha).fromNow()}
              </span>
            </div>
            {n.mensaje && (
              <Typography.Paragraph
                ellipsis={{ rows: 2, tooltip: n.mensaje }}
                style={{ margin: 0, fontSize: 12, color: token.colorTextTertiary }}
              >
                {n.mensaje}
              </Typography.Paragraph>
            )}
          </div>
        </List.Item>
      )}
    />
  )

  return (
    <Popover
      content={lista}
      styles={{ container: { padding: 0 } }}
      title={
        <span
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 10px 0',
          }}
        >
          Notificaciones
          {noLeidas > 0 && (
            <Button type="link" size="small" onClick={() => void marcarTodas()}>
              Marcar todas como leídas
            </Button>
          )}
        </span>
      }
      trigger="click"
      placement="bottomRight"
    >
      <Badge count={noLeidas} size="small">
        <Button type="text" icon={<BellOutlined />} aria-label="Notificaciones" />
      </Badge>
    </Popover>
  )
}
