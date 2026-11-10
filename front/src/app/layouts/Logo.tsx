import { Flex, Typography } from 'antd'
import { useMarcaStore } from 'stores/marca.store'

/** Logo + nombre de la aplicación. Con `soloIcono` (menú colapsado) muestra solo la imagen. */
export default function Logo({ soloIcono = false }: { soloIcono?: boolean }) {
  const nombreApp = useMarcaStore(estado => estado.marca.nombreApp)
  const logo = useMarcaStore(estado => estado.logo)
  return (
    <Flex align="center" gap={8} style={{ height: 48, padding: '0 10px', overflow: 'hidden' }}>
      <img src={logo} alt={nombreApp} style={{ width: 24, height: 24, flexShrink: 0 }} />
      {soloIcono ? null : (
        <Typography.Text strong ellipsis style={{ fontSize: 18 }}>
          {nombreApp}
        </Typography.Text>
      )}
    </Flex>
  )
}
