import { Row, Space, Tag, Typography } from 'antd'
import Validacion from 'pages/catalogos/6.validaciones/componentes/validacion'
import type { ProductoArticulo } from 'pages/componentes/tipos'
import type { InventarioDetalle } from '../../../tipos'

export interface ArticuloDatosProps {
  producto: ProductoArticulo
  inventarioActual: InventarioDetalle
}

// Tolera relaciones ausentes (`productoClaves`, `area`, `bodega`) en respuestas incompletas (F36).
const ArticuloDatos = ({
  producto: { productoClaves, area, descripcion, titulo, id: productoId, productoValidado = null },
  inventarioActual: { bodega, cantidad },
}: ArticuloDatosProps) => {
  const piezas = parseInt(String(cantidad), 10)

  return (
    <>
      <Row justify="end" style={{ marginTop: '15px' }}>
        <Space>
          <Validacion productoId={productoId} productoValidado={productoValidado} />
          <Tag style={{ fontSize: '130%' }}>
            {' '}
            {productoClaves && productoClaves.length > 0 ? productoClaves[0].barras : '---'}{' '}
          </Tag>
        </Space>
      </Row>
      <Typography.Title level={3}> {titulo} </Typography.Title>
      <Typography.Title level={3}>
        {' '}
        {`${piezas} ${piezas !== 1 ? 'piezas' : 'pieza'}`}{' '}
      </Typography.Title>
      <Typography.Paragraph>{descripcion}</Typography.Paragraph>
      <br />
      <Typography.Text strong>Almacén:</Typography.Text>{' '}
      <Typography.Text>{bodega?.nombre}</Typography.Text>
      <br />
      <Typography.Text strong>Área:</Typography.Text>{' '}
      <Typography.Text>{area?.nombre}</Typography.Text>
      <br />
    </>
  )
}

export default ArticuloDatos
