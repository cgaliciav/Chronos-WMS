import { Typography } from 'antd'
import { useMarcaStore } from 'stores/marca.store'

/** Pie de página común (antes `cleanui/layout/Footer`): crédito del proveedor, aviso de privacidad y soporte. */
export default function PieDePagina({ centrado = false }: { centrado?: boolean }) {
  const { creditoProveedor, avisoPrivacidadUrl, soporteCorreo } = useMarcaStore(
    estado => estado.marca,
  )
  return (
    <div style={{ textAlign: centrado ? 'center' : 'left' }}>
      {creditoProveedor.visible && (
        <Typography.Link
          href={creditoProveedor.url}
          target="_blank"
          rel="noopener noreferrer"
          strong
        >
          {creditoProveedor.texto}
        </Typography.Link>
      )}
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        {avisoPrivacidadUrl ? (
          <Typography.Link href={avisoPrivacidadUrl} target="_blank" rel="noopener noreferrer">
            Aviso de privacidad
          </Typography.Link>
        ) : (
          'Aviso de privacidad'
        )}{' '}
        |{' '}
        <Typography.Link href={`mailto:${soporteCorreo}`} target="_blank" rel="noopener noreferrer">
          Soporte técnico
        </Typography.Link>
      </Typography.Paragraph>
    </div>
  )
}
