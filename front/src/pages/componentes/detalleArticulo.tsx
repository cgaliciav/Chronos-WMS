import { useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router'
import { Col, Divider, Row, Skeleton, Spin, Tabs, Tag } from 'antd'
import { tieneAlgunRol, useUsuarioStore } from 'stores/usuario.store'
import ACL from 'app/auth/ACL'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import ModalImagenes from 'pages/componentes/modalImagenes'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import ClavesProducto from 'pages/componentes/claves'
import PreciosProducto from 'pages/componentes/precios'
import ArticuloDatos from 'pages/componentes/articulo'
import Movimientos from 'pages/componentes/movimientos'
import Transformaciones from 'pages/componentes/transformaciones'
import Inventarios from 'pages/componentes/inventarios'
import type { InventarioDetalle } from 'pages/catalogos/tipos'

interface DetalleArticuloProps {
  /** Id de `inventarioActual`; con `0` no se pide nada. */
  inventarioActualId: number | string
}

/**
 * Detalle de un artículo (imágenes, datos y pestañas). Lo usan la página `/articulos/detalle` y la ventana que abren
 * los resultados de las búsquedas (`ModalDetalleArticulo`).
 */
const DetalleArticulo = ({ inventarioActualId: id }: DetalleArticuloProps) => {
  const [mostrarModal, setMostrarModal] = useState(false)
  const [cargando, setCargando] = useState(id !== 0)
  // `null` hasta que responde el API; si la respuesta llega sin producto se sigue mostrando el esqueleto (F36).
  const [inventarioActual, setInventarioActual] = useState<InventarioDetalle | null>(null)

  const puedeVerInventarios = useUsuarioStore(estado =>
    tieneAlgunRol(estado.permisos, ['ADMINISTRADOR', 'VALIDACIONES']),
  )

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
    <>
      <Spin spinning={cargando}>
        {inventarioActual && producto ? (
          <Row gutter={{ xs: 2, sm: 4, md: 6, lg: 12, xl: 12 }}>
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
                      <ClavesProducto productoClaves={producto.productoClaves} loading={cargando} />
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
                    key: 'transformaciones',
                    label: 'Transformaciones',
                    children: <Transformaciones inventarioActualId={id} loading={cargando} />,
                  },
                  // El inventariado solo lo consulta quien valida (`/item-balance` exige ese permiso).
                  ...(puedeVerInventarios
                    ? [
                        {
                          key: 'inventarios',
                          label: 'Inventarios',
                          children: <Inventarios productoId={producto.id} loading={cargando} />,
                        },
                      ]
                    : []),
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
    </>
  )
}

export default DetalleArticulo
