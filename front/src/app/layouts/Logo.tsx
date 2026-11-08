import { Flex, Typography } from 'antd'

export const NOMBRE_APP = 'Sony Almacén México'

/** Logo + nombre de la aplicación. Con `soloIcono` (menú colapsado) muestra solo la imagen. */
export default function Logo({ soloIcono = false }: { soloIcono?: boolean }) {
  return (
    <Flex align="center" gap={8} style={{ height: 64, padding: '0 20px', overflow: 'hidden' }}>
      <img src="resources/images/logo.svg" alt={NOMBRE_APP} style={{ width: 24, height: 24, flexShrink: 0 }} />
      {soloIcono ? null : (
        <Typography.Text strong ellipsis style={{ fontSize: 18 }}>
          {NOMBRE_APP}
        </Typography.Text>
      )}
    </Flex>
  )
}
