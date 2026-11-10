import { useEffect, useState, type MouseEvent } from 'react'
import { useLocation } from 'react-router'
import { Col, Divider, Row, Skeleton, Spin } from 'antd'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import ModalImagenes from 'pages/componentes/modalImagenes'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import type { InventarioDetalle } from '../../tipos'
import ArticuloDatos from './components/articulo'

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
    <ACL roles={['VALIDACIONES', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Artículo validacion" />
      <Encabezado>Artículo validación</Encabezado>
      <Tarjeta>
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
              </Col>
              <Col xl={18} xxl={18} lg={16} md={16} sm={24} xs={24}>
                <ArticuloDatos producto={producto} inventarioActual={inventarioActual} />
                <Divider dashed />
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
