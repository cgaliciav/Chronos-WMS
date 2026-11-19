import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import QueryString from 'query-string'
import { Alert, Col, Row, Space, Typography } from 'antd'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useUsuarioStore } from 'stores/usuario.store'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import ModalImagenes from 'pages/componentes/modalImagenes'
import FormaTransformacion, {
  type ValoresTransformacion,
} from 'pages/operaciones/componentes/formaTransformacion'
import TablaOperaciones from 'pages/operaciones/componentes/tablaOperaciones'
import ColumnasOperaciones from 'pages/operaciones/componentes/columnasTablaOperaciones'
import NombreListado from 'pages/operaciones/componentes/nombreListado'
import type { Archivo, Estatus, Grupo } from 'types/api'

/** El grupo que muestra la página; hasta que llega del API, vacío y sin estatus. */
type GrupoPagina = Omit<Grupo, 'estatus'> & { estatus: Estatus | '' }

/**
 * Transformaciones de una producción (decisión 20): unidades de un artículo que tiene la producción se convierten en
 * uno o más productos nuevos, que quedan a su cargo hasta que los devuelva. No se deshacen.
 */
const TransformacionesOperacion = () => {
  const almacenistaNombre = useUsuarioStore(estado => estado.nombre)
  const [grupoId, setGrupoId] = useState<number | string>(0)
  const [cargando, setCargando] = useState(true)
  const [conteoRefresh, setConteoRefresh] = useState(0)
  const [mostrarModalImagenes, setMostrarModalImagenes] = useState(false)
  const [archivosImagenes, setArchivosImagenes] = useState<Archivo[]>([])
  const [grupo, setGrupo] = useState<GrupoPagina>({ id: 0, nombre: '', estatus: '' })

  const columns = [
    ColumnasOperaciones.foto(setArchivosImagenes, setMostrarModalImagenes),
    ColumnasOperaciones.producto,
    ColumnasOperaciones.clave,
    ColumnasOperaciones.cantidad,
    ColumnasOperaciones.operacion,
    ColumnasOperaciones.almacenista,
    ColumnasOperaciones.funciones(),
  ]

  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    setGrupoId(typeof uid === 'string' ? uid : 0)
  }, [location])

  const actualizar = () => {
    if (grupoId !== 0) {
      setCargando(true)
      GrupoPeticiones.obtenerId(grupoId)
        .then(resp => {
          if (resp !== undefined) setGrupo(resp)
        })
        .catch(() => {}) // El interceptor de axios ya mostró el error.
        .finally(() => {
          setCargando(false)
        })
    }
  }

  useEffect(() => {
    actualizar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId])

  const handleFinish = async (valores: ValoresTransformacion) => {
    const proyectoId = grupo.grupoDetalle?.proyecto?.id
    const usuariosIds = (grupo.grupoDetalle?.usuarios ?? []).map(usr => usr.id)
    setCargando(true)

    try {
      const resp = await GrupoPeticiones.transformar({
        codigo: valores.clave,
        cantidad: valores.cantidad,
        proyectoId,
        usuariosIds,
        grupoId: grupo.id,
        productos: valores.productos.map(producto => ({
          titulo: producto.titulo,
          descripcion: producto.descripcion ?? '',
          cantidad: producto.cantidad,
          // `0` = igual que el original: no se envía el tipo y el API lo hereda.
          productoTipoId: producto.productoTipoId ? producto.productoTipoId : undefined,
        })),
      })
      setConteoRefresh(conteoRefresh + 1)
      notification.success({
        title: 'Transformación registrada',
        description: `Se crearon ${resp.derivados.length} producto(s) nuevos a cargo de la producción.`,
      })
      return 1
    } catch {
      // El interceptor de axios ya mostró el error.
      return 0
    } finally {
      setCargando(false)
    }
  }

  const { nombre: grupoNombre, estatus: estatusGrupo, grupoDetalle } = grupo
  const proyectoNombre = grupoDetalle?.proyecto?.nombre ?? ''
  const usuariosResponsables = (grupoDetalle?.usuarios ?? []).map(usr => usr.nombre)

  return (
    <ACL roles={['GRUPOS-TRANSFORMAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Transformación" />
      <Encabezado>Transformación</Encabezado>
      <Tarjeta
        title={
          <Row align="middle">
            <Col span={12}>
              {proyectoNombre ? (
                <Typography.Title style={{ margin: '0' }} level={3}>
                  {proyectoNombre}
                </Typography.Title>
              ) : null}
              <NombreListado grupoId={grupo.id} nombre={grupoNombre} alRenombrar={actualizar} />
            </Col>
            <Col span={12}>
              <Row justify="end">
                <Space size={0} orientation="vertical" align="end">
                  <Typography.Text strong type="warning">
                    Almacenista: {almacenistaNombre}
                  </Typography.Text>
                  {usuariosResponsables.length > 0 ? (
                    <Typography.Text strong>
                      Usuarios: {usuariosResponsables.join(', ')}
                    </Typography.Text>
                  ) : null}
                </Space>
              </Row>
            </Col>
          </Row>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Solo se transforma lo que tiene la producción"
          description="El artículo debe estar prestado a esta producción o haber sido comprado por ella. Las unidades usadas se descuentan de su pendiente y los productos nuevos quedan a su cargo hasta que los devuelva. Una transformación no se puede deshacer."
        />
        <FormaTransformacion
          cargando={cargando}
          handleFinish={handleFinish}
          habilitado={estatusGrupo !== 'inactivo' && grupo.id !== 0}
        />

        <TablaOperaciones
          columns={columns}
          fnPeticion={GrupoPeticiones.movimientosPorGrupo}
          titulo="Transformaciones del listado"
          grupoId={grupoId}
          conteoRefresh={conteoRefresh}
          cargando={cargando}
          grupoNombre={grupoNombre}
          movimientoTipoNombre="TRANSFORMACIÓN"
        />
      </Tarjeta>
      <ModalImagenes
        mostrarModal={mostrarModalImagenes}
        cerrarModal={() => {
          setMostrarModalImagenes(false)
        }}
        archivos={archivosImagenes}
      />
    </ACL>
  )
}

export default TransformacionesOperacion
