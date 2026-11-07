import React from 'react'
import { useHistory } from 'react-router-dom'
import { Col, Row, Card, Typography, Divider } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
// import Validacion from './validacion'
import Inventariado from 'pages/catalogos/6.validaciones/componentes/inventariado'

const { Title, Paragraph } = Typography

const TarjetaProductoValidacion = ({
  id,
  producto: { titulo, descripcion, archivos, id: productoId, productoInventariado },
}) => {
  const history = useHistory()

  const onClick = e => {
    e.preventDefault()
    history.push(`/articulos/validado?uid=${id}`)
  }

  return (
    <>
      <Card
        hoverable
        cover={<ImagenesEnCarrusel archivos={archivos} rutaEnApi="file/review/" />}
        title={
          <>
            <Row>
              <Col xs={7} sm={5} xl={4}>
                <Inventariado
                  productoId={productoId}
                  productoInventariado={productoInventariado}
                />
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
          </>
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
