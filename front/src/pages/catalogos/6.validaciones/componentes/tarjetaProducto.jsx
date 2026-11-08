import React  from 'react'
import { useNavigate } from 'react-router'
import { Col, Row, Card, Typography, Divider, } from 'antd'
import { EyeOutlined, } from '@ant-design/icons'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import Validacion from './validacion'

const { Title, Paragraph } = Typography

const TarjetaProductoValidacion = ({
  id,
  producto: { titulo, descripcion, archivos, id: productoId, productoValidado },
}) => {
  const navigate = useNavigate()

  const onClick = e => {
    e.preventDefault()
    navigate(`/articulos/validado?uid=${id}`)
  }

  return (
    <>
      <Card
        hoverable
        cover={<ImagenesEnCarrusel archivos={archivos} rutaEnApi="file/review/" />}
        title={
          <>
            <Row>
              <Col xs={17} sm={19} xl={20}>
                <Title level={4} ellipsis> {titulo} </Title>
              </Col>
              <Col xs={7} sm={5} xl={4}>
                <Validacion productoId={productoId} productoValidado={productoValidado} />
              </Col>
            </Row> 
          </>}
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
