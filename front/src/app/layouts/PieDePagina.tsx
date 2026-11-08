import { Typography } from 'antd'

/** Pie de página común (antes `cleanui/layout/Footer`). */
export default function PieDePagina({ centrado = false }: { centrado?: boolean }) {
  return (
    <div style={{ textAlign: centrado ? 'center' : 'left' }}>
      <Typography.Link href="https://exogrid.io/software" target="_blank" rel="noopener noreferrer" strong>
        EXOGRID TECHNOLOGY
      </Typography.Link>
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        Aviso de privacidad |{' '}
        <Typography.Link href="mailto:cesar.gv@exogrid.io" target="_blank" rel="noopener noreferrer">
          Soporte técnico
        </Typography.Link>
      </Typography.Paragraph>
    </div>
  )
}
