import { useState, type MouseEvent } from 'react'
import { Col, Collapse, Empty, Row } from 'antd'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import ArticuloDatos from 'pages/componentes/articulo'
import ModalImagenes from 'pages/componentes/modalImagenes'
import type { UltimoArticuloAgregadoProps } from '../tipos'

export type { UltimoArticuloAgregadoProps } from '../tipos'

const movimientoVacio: NonNullable<UltimoArticuloAgregadoProps['movimiento']> = {
  id: 0,
  inventarioActual: {
    id: 0,
    cantidad: 0,
    cantidadAlmacen: 0,
    disponible: 'no-disponible',
    producto: {
      id: 0,
      titulo: '',
      archivos: [],
    },
  },
}

const UltimoArticuloAgregado = ({ movimiento = movimientoVacio }: UltimoArticuloAgregadoProps) => {
  const [mostrarModal, setMostrarModal] = useState(false)

  const abrirModal = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault()
    setMostrarModal(true)
  }

  const { inventarioActual } = movimiento
  const producto = inventarioActual?.producto
  const archivos = producto?.archivos ?? []
  return (
    <>
      <Collapse
        items={[
          {
            key: '1',
            label: 'Último artículo agregado',
            children:
              movimiento.id === 0 || !inventarioActual || !producto ? (
                <Empty description="Sin información" />
              ) : (
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
                    <ArticuloDatos producto={producto} inventarioActual={inventarioActual} />
                  </Col>
                </Row>
              ),
          },
        ]}
      />
      {movimiento.id !== 0 ? (
        <ModalImagenes
          mostrarModal={mostrarModal}
          cerrarModal={() => {
            setMostrarModal(false)
          }}
          archivos={archivos}
        />
      ) : null}
    </>
  )
}

export default UltimoArticuloAgregado
