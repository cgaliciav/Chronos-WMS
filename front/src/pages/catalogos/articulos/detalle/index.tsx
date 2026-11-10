import { useEffect, useState, type MouseEvent } from 'react'
import { useLocation, Link } from 'react-router'
import { Col, Divider, Row, Skeleton, Spin, Tabs, Tag } from 'antd'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import ModalImagenes from 'pages/componentes/modalImagenes'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import ClavesProducto from 'pages/componentes/claves'
import PreciosProducto from 'pages/componentes/precios'
import ArticuloDatos from 'pages/componentes/articulo'
import Movimientos from 'pages/componentes/movimientos'
import Inventarios from 'pages/componentes/inventarios'
import type { InventarioDetalle } from '../../tipos'

const ArticuloDetalle = () => {
  const [mostrarModal, setMostrarModal] = useState(false)
  const [id, setId] = useState<number | string>(0)
  const [cargando, setCargando] = useState(true)
  // `null` hasta que responde el API; si la respuesta llega sin producto se sigue mostrando el esqueleto (F36).
  const [inventarioActual, setInventarioActual] = useState<InventarioDetalle | null>(null)

  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    if (typeof uid === 'string') {
      setId(uid)
    } else {
      // Sin `?uid` no hay nada que pedir (antes se pedía `/current-inventory/undefined`).
      setCargando(false)
    }
  }, [location])

  useEffect(() => {
    if (id === 0) return
    setCargando(true)
    InventarioAcualPeticiones.obtenerId(id)
      .then(resp => {
        if (resp !== undefined) {
          setInventarioActual(resp)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }, [id])

  const abrirModal = (e: MouseEvent) => {
    e.preventDefault()
    setMostrarModal(true)
  }

  const cerrarModal = () => {
    setMostrarModal(false)
  }

  const producto = inventarioActual?.producto

  return (
    <ACL roles={['V-ARTICULOS-DETALLE', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Artículo detalle" />
      <Encabezado>Artículo detalle</Encabezado>
      <Tarjeta>
        <Spin spinning={cargando}>
          {inventarioActual && producto ? (
            <Row gutter={{ xs: 4, sm: 8, md: 12, lg: 24, xl: 24 }}>
              <Col xl={6} xxl={6} lg={8} md={8} sm={24} xs={24}>
                <ImagenesEnCarrusel
                  archivos={producto.archivos}
                  rutaEnApi="file/catalog/"
                  hacerGrande
                  onClickImagen={abrirModal}
                />
                <Divider dashed />
                <Row justify="center">
                  <ACL roles={['ARTICULOS-EDITAR', 'ADMINISTRADOR']}>
                    <Link to={`/articulos/editar/detalle?uid=${id}`}>
                      <Tag color="orange">Editar Artículo</Tag>
                    </Link>
                  </ACL>
                </Row>
                <Divider plain />
              </Col>
              <Col xl={18} xxl={18} lg={16} md={16} sm={24} xs={24}>
                <ArticuloDatos producto={producto} inventarioActual={inventarioActual} />
                <Divider dashed />
                <Tabs
                  defaultActiveKey="caracteristicas"
                  size="small"
                  items={[
                    {
                      key: 'caracteristicas',
                      label: 'Características',
                      children: (
                        <CaracteristicasProducto
                          productoCaracteristicas={producto.productoCaracteristicas}
                          loading={cargando}
                        />
                      ),
                    },
                    {
                      key: 'codigos',
                      label: 'Códigos',
                      children: (
                        <ClavesProducto
                          productoClaves={producto.productoClaves}
                          loading={cargando}
                        />
                      ),
                    },
                    {
                      key: 'precios',
                      label: 'Precios',
                      children: (
                        <PreciosProducto
                          productoPrecios={producto.productoPrecios}
                          loading={cargando}
                        />
                      ),
                    },
                    {
                      key: 'movimientos',
                      label: 'Movimientos',
                      children: <Movimientos inventarioActualId={id} loading={cargando} />,
                    },
                    {
                      key: 'inventarios',
                      label: 'Inventarios',
                      children: <Inventarios productoId={producto.id} loading={cargando} />,
                    },
                  ]}
                />
              </Col>
            </Row>
          ) : (
            <Skeleton active />
          )}
        </Spin>
        <ModalImagenes
          mostrarModal={mostrarModal}
          cerrarModal={cerrarModal}
          archivos={producto?.archivos}
        />
      </Tarjeta>
    </ACL>
  )
}

export default ArticuloDetalle
