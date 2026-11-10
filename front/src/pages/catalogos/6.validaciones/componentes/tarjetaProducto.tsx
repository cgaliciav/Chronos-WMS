import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { Col, Row, Card, Typography } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import type { InventarioCatalogo, ProductoCatalogo } from '../../tipos'
import Validacion from './validacion'

const { Title, Paragraph } = Typography

const TarjetaProductoValidacion = ({ id, producto }: InventarioCatalogo) => {
  const {
    titulo,
    descripcion,
    archivos,
    id: productoId,
    productoValidado,
  }: Partial<ProductoCatalogo> = producto ?? {}
  const navigate = useNavigate()

  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    navigate(`/articulos/validado?uid=${id}`)
  }

  return (
    <>
      {/* Imagen cuadrada, descripción de dos líneas y `height: 100%`: tarjetas del mismo tamaño en la cuadrícula. */}
      <Card
        hoverable
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1 } }}
        cover={<ImagenesEnCarrusel archivos={archivos} rutaEnApi="file/review/" cuadrada />}
        title={
          <Row>
            <Col xs={17} sm={19} xl={20}>
              <Title level={4} ellipsis>
                {' '}
                {titulo}{' '}
              </Title>
            </Col>
            <Col xs={7} sm={5} xl={4}>
              <Validacion productoId={productoId} productoValidado={productoValidado} />
            </Col>
          </Row>
        }
        actions={[<EyeOutlined key="ver" onClick={onClick} />]}
      >
        <Paragraph
          ellipsis={{ rows: 2, tooltip: descripcion }}
          style={{ minHeight: `${2 * 1.5715}em` }}
        >
          {descripcion}
        </Paragraph>
        <Row />
      </Card>
    </>
  )
}

export default TarjetaProductoValidacion
