import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { Col, Row, Card, Typography, Divider } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import Inventariado from 'pages/catalogos/6.validaciones/componentes/inventariado'
import type { InventarioCatalogo, ProductoCatalogo } from '../../tipos'

const { Title, Paragraph } = Typography

const TarjetaProductoValidacion = ({ id, producto }: InventarioCatalogo) => {
  const {
    titulo,
    descripcion,
    archivos,
    id: productoId,
    productoInventarios,
  }: Partial<ProductoCatalogo> = producto ?? {}
  const navigate = useNavigate()

  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    navigate(`/articulos/validado?uid=${id}`)
  }

  return (
    <>
      <Card
        hoverable
        cover={<ImagenesEnCarrusel archivos={archivos} rutaEnApi="file/review/" />}
        title={
          <Row>
            <Col xs={7} sm={5} xl={4}>
              <Inventariado productoId={productoId} productoInventariado={productoInventarios} />
            </Col>
            <Col xs={10} sm={14} xl={16} />
            <Col xs={7} sm={5} xl={4} />
            <Row>
              <Col span={24}>
                <Title level={4} ellipsis>
                  {' '}
                  {titulo}{' '}
                </Title>
              </Col>
            </Row>
          </Row>
        }
        actions={[<EyeOutlined key="ver" onClick={onClick} />]}
      >
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'ver más' }}>
          {descripcion}
        </Paragraph>
        <Row />
      </Card>
      <Divider />
    </>
  )
}

export default TarjetaProductoValidacion
