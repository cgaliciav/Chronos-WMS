import React,{useState} from 'react'
import { Row, Col,Space, Tag, Typography,Spin } from 'antd'
import ImagenesEnCarrusel from 'pages/componentes/imaganesEnCarrusel'
import ModalImagenes from 'pages/componentes/modalImagenes'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'

const ArticuloMovimiento = ({
  movimiento:{
    cantidad,
    inventarioActual: { 
      bodega,
      producto: { 
        productoPrecios,
        productoClaves, 
        area, 
        descripcion, 
        titulo,
        archivos,
      },
    },
    operacion:{
      movimientoTipo:{
        nombre:movimientoNombre
      }
    }
  },
  loading, 
  
  
}) => {
  const [mostrarModal, setMostrarModal] = useState(false)

  const abrirModal = e => {
    e.preventDefault()
    setMostrarModal(true)
  }

  const cerrarModal = e => {
    e.preventDefault()
    setMostrarModal(false)
  }

  const precio=productoPrecios?.find(pp=>(pp.precioTipo.id===2)).precio;

  return (
    <>
      <Spin spinning={loading}>
        <Row gutter={{ xs: 4, sm: 8, md: 12, lg: 24, xl: 24 }}>
          <Col xl={8} xxl={8} lg={12} md={12} sm={24} xs={24}>
            <ImagenesEnCarrusel
              archivos={archivos}
              rutaEnApi="file/catalog/"
              hacerGrande
              onClickImagen={abrirModal}
            />
          </Col>
          <Col xl={14} xxl={14} lg={12} md={12} sm={24} xs={24}>
            <Row justify="end" style={{ marginTop: '15px' }}>
              <Space>
                <Tag> {productoClaves.length > 0 ? productoClaves[0].barras : '---'} </Tag>
              </Space>
            </Row>
            <Typography.Title level={3}> {titulo} </Typography.Title>
            <Typography.Title level={3}>
              {' '}
              {`${parseInt(cantidad, 10)} ${parseInt(cantidad, 10) !== 1 ? 'piezas' : 'pieza'} en ${movimientoNombre}`}
            </Typography.Title>
            <Typography.Title level={3}>
              {' '}
              {`${formatoMonedaMexico(precio)}`}
            </Typography.Title>
            <Typography.Paragraph>{descripcion}</Typography.Paragraph>
            <br />
            <Typography.Text strong>Almacén:</Typography.Text>{' '}
            <Typography.Text>{bodega.nombre}</Typography.Text>
            <br />
            <Typography.Text strong>Área:</Typography.Text>{' '}
            <Typography.Text>{area.nombre}</Typography.Text>
            <br />
          </Col>
        </Row>
      </Spin>
      <ModalImagenes mostrarModal={mostrarModal} cerrarModal={cerrarModal} archivos={archivos} />
      
    </>
  )
}

export default ArticuloMovimiento
