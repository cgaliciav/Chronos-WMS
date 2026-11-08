import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import { useLocation } from 'react-router'
import { Col, Divider, Row, Spin, Tabs, Tag } from 'antd'
import QueryString from 'query-string'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import ModalImagenes from 'pages/componentes/modalImagenes'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
// import Comentarios from 'pages/componentes/comentarios'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import ClavesProducto from 'pages/componentes/claves'
import PreciosProducto from 'pages/componentes/precios'
import ArticuloDatos from 'pages/componentes/articulo'
import Movimientos from 'pages/componentes/movimientos'
import Inventarios from 'pages/componentes/inventarios'

const ArticuloDetalle = () => {
  const [mostrarModal, setMostrarModal] = useState(false)
  const [id, setId] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [inventarioActual, setInventarioActual] = useState({
    cantidad: 0,
    disponible: 'no definido',
    fechaDisponibilidad: moment(),
    bodega: { id: 0, nombre: '------' },
    producto: {
      archivos: [],
      productoPrecios: [],
      productoCaracteristicas: [],
      productoClaves: [],
      productoInventarios: [],
      area: { id: 0, nombre: '-----' },
      id: 0,
      descripcion: '----------------',
      titulo: '------',
    },
  })

  // const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const value = QueryString.parse(location.search.replace('?', ''))
    setId(value.uid)
  }, [location])

  useEffect(() => {
    if (id === 0) return
    setCargando(true)
    InventarioAcualPeticiones.obtenerId(id)
      .then(resp => {
        if (resp !== undefined) {
          setInventarioActual(resp)
          // console.log('****** INVENTARIO ACTUAL', resp)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }, [id])

  const abrirModal = e => {
    e.preventDefault()
    setMostrarModal(true)
  }

  const cerrarModal = e => {
    e.preventDefault()
    setMostrarModal(false)
  }

  const {
    archivos,
    productoClaves,
    productoCaracteristicas,
    // comentarios,
    productoPrecios,
    productoInventarios,
    id: productoId,
  } = inventarioActual.producto;

  console.log({productoInventarios});



  return (
    <ACL roles={['V-ARTICULOS-DETALLE', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Artículo detalle" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Artículo detalle</span>
        </h5>
      </div>
      <div className="card">
        <Spin spinning={cargando}>
          <Row gutter={{ xs: 4, sm: 8, md: 12, lg: 24, xl: 24 }}>
            <Col xl={6} xxl={6} lg={8} md={8} sm={24} xs={24}>
              <ImagenesEnCarrusel
                archivos={archivos}
                rutaEnApi="file/catalog/"
                hacerGrande
                onClickImagen={abrirModal}
              />
              <Divider dashed />
              <Row justify="center">
                <ACL roles={['ARTICULOS-EDITAR', 'ADMINISTRADOR']}>
                  <a href={`#/articulos/editar/detalle?uid=${id}`}>
                    <Tag color="orange">Editar Artículo</Tag>
                  </a>
                </ACL>
              </Row>
              <Divider plain />
            </Col>
            <Col xl={18} xxl={18} lg={16} md={16} sm={24} xs={24}>
              <ArticuloDatos
                producto={inventarioActual.producto}
                inventarioActual={inventarioActual}
              />
              <Divider dashed />
              <Tabs defaultActiveKey="caracteristicas" size="small">
                <Tabs.TabPane tab="Características" key="caracteristicas">
                  <CaracteristicasProducto
                    productoCaracteristicas={productoCaracteristicas}
                    loading={cargando}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Códigos" key="codigos">
                  <ClavesProducto productoClaves={productoClaves} loading={cargando} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Precios" key="precios">
                  <PreciosProducto productoPrecios={productoPrecios} loading={cargando} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Movimientos" key="movimientos">
                  <Movimientos inventarioActualId={id} loading={cargando} />
                  {/* TODO: colocar movimientos aqui */}
                </Tabs.TabPane>
                <Tabs.TabPane tab="Inventarios" key="inventarios">
                  <Inventarios productoId={productoId} loading={cargando} />
                  {/* TODO: colocar movimientos aqui */}
                </Tabs.TabPane>
                {/* <Tabs.TabPane tab="Comentarios" key="comentarios">
                  <Comentarios comentarios={comentarios} loading={cargando} formVisible={false} />
                </Tabs.TabPane> */}
              </Tabs>
            </Col>
          </Row>
        </Spin>
        <ModalImagenes mostrarModal={mostrarModal} cerrarModal={cerrarModal} archivos={archivos} />
      </div>
    </ACL>
  )
}

export default ArticuloDetalle
