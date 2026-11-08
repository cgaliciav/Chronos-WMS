import { useState, type MouseEvent } from 'react'
import { Row, Col, Space, Tag, Typography, Spin } from 'antd'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import ModalImagenes from 'pages/componentes/modalImagenes'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'
import type { EventoCerrarModal } from 'pages/componentes/tipos'
import type { ArticuloMovimientoProps } from '../tipos'

export type { ArticuloMovimientoProps } from '../tipos'

const ArticuloMovimiento = ({ movimiento, loading }: ArticuloMovimientoProps) => {
  const [mostrarModal, setMostrarModal] = useState(false)

  const { cantidad, inventarioActual, operacion } = movimiento
  const bodega = inventarioActual?.bodega
  const producto = inventarioActual?.producto
  const productoClaves = producto?.productoClaves ?? []
  const archivos = producto?.archivos ?? []
  const movimientoNombre = operacion?.movimientoTipo.nombre

  const abrirModal = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault()
    setMostrarModal(true)
  }

  const cerrarModal = (e: EventoCerrarModal) => {
    e.preventDefault()
    setMostrarModal(false)
  }

  const precio = producto?.productoPrecios?.find(pp => pp.precioTipo.id === 2)?.precio
  const piezas = parseInt(String(cantidad), 10)

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
            <Typography.Title level={3}> {producto?.titulo} </Typography.Title>
            <Typography.Title level={3}>
              {' '}
              {`${piezas} ${piezas !== 1 ? 'piezas' : 'pieza'} en ${movimientoNombre}`}
            </Typography.Title>
            <Typography.Title level={3}> {`${formatoMonedaMexico(precio)}`}</Typography.Title>
            <Typography.Paragraph>{producto?.descripcion}</Typography.Paragraph>
            <br />
            <Typography.Text strong>Almacén:</Typography.Text>{' '}
            <Typography.Text>{bodega?.nombre}</Typography.Text>
            <br />
            <Typography.Text strong>Área:</Typography.Text>{' '}
            <Typography.Text>{producto?.area?.nombre}</Typography.Text>
            <br />
          </Col>
        </Row>
      </Spin>
      <ModalImagenes mostrarModal={mostrarModal} cerrarModal={cerrarModal} archivos={archivos} />
    </>
  )
}

export default ArticuloMovimiento
