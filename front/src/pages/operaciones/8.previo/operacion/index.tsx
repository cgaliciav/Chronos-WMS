import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { useLocation } from 'react-router'
import QueryString from 'query-string'
import { Row, Button, Col, Typography, Space } from 'antd'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useUsuarioStore } from 'stores/usuario.store'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import ModalImagenes from 'pages/componentes/modalImagenes'
import FormaBusquedaPDBP from 'pages/operaciones/componentes/formaPDBP'
import TablaOperaciones from 'pages/operaciones/componentes/tablaOperaciones'
import ModalArchivos from 'pages/componentes/modalArchivos'
import ModalComentarios from 'pages/componentes/modalComentarios'
import ColumnasOperaciones from 'pages/operaciones/componentes/columnasTablaOperaciones'
import type { ValoresBusquedaPDBP } from 'pages/operaciones/tipos'
import type { Archivo, Comentario, Estatus, Grupo } from 'types/api'

/** El grupo que muestra la página; hasta que llega del API, vacío y sin estatus. */
type GrupoPagina = Omit<Grupo, 'estatus'> & { estatus: Estatus | '' }

const PrevioOperacion = () => {
  const almacenistaNombre = useUsuarioStore(estado => estado.nombre)
  const [grupoId, setGrupoId] = useState<number | string>(0)
  const [cargando, setCargando] = useState(true)
  const [conteoRefresh, setConteoRefresh] = useState(0) // utilizado para acutalizar la lista en su vista actual
  const [mostrarModalImagenes, setMostrarModalImagenes] = useState(false)
  const [archivosImagenes, setArchivosImagenes] = useState<Archivo[]>([])
  const [mostrarModalComentarios, setMostrarModalComentarios] = useState(false)
  const [comentariosGrupo, setComentariosGrupo] = useState<Comentario[]>([])
  const [mostrarModalArchivos, setMostrarModalArchivos] = useState(false)
  const [archivosGrupo, setArchivosGrupo] = useState<Archivo[]>([])
  const [grupo, setGrupo] = useState<GrupoPagina>({ id: 0, nombre: '', estatus: '' })

  const quitarMovimiento = (movimientoId: number) => {
    setCargando(true)
    GrupoPeticiones.quitarMovimiento({
      movimientoId,
    })
      .then(resp => {
        if (resp !== undefined) {
          setConteoRefresh(conteoRefresh + 1) // esto actualiza la lista en su vista actual
          notification.success({
            title: 'Artículo removido de la lista correctamente',
          })
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setCargando(false)
      })
  }

  const columns = [
    ColumnasOperaciones.foto(setArchivosImagenes, setMostrarModalImagenes),
    ColumnasOperaciones.producto,
    ColumnasOperaciones.clave,
    ColumnasOperaciones.almacen,
    ColumnasOperaciones.operacion,
    ColumnasOperaciones.almacenista,
    ColumnasOperaciones.funciones(grupo.estatus === 'activo' ? quitarMovimiento : undefined),
  ]

  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    setGrupoId(typeof uid === 'string' ? uid : 0)
  }, [location])

  useEffect(() => {
    actualizar()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId])

  const actualizar = () => {
    if (grupoId !== 0) {
      setCargando(true)
      GrupoPeticiones.obtenerId(grupoId)
        .then(resp => {
          if (resp !== undefined) {
            setGrupo(resp)
            setComentariosGrupo(resp.comentarios ?? [])
            setArchivosGrupo(resp.archivos ?? [])
          }
        })
        .catch(() => {})
        .finally(() => {
          setCargando(false)
        })
    }
  }

  const handleDisable = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault()
    setCargando(true)
    GrupoPeticiones.inhabilitar(grupo.id)
      .then(resp => {
        if (resp !== undefined) {
          notification.success({
            title: 'Listado inhabilidato correctamente',
            description: 'Ya no se podrán agregar articulos a la lista',
          })
          actualizar()
        }
      })
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }

  const handleEnable = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault()
    setCargando(true)
    GrupoPeticiones.habilitar(grupo.id)
      .then(resp => {
        if (resp !== undefined) {
          notification.success({
            title: 'Listado habilitado correctamente',
          })
          actualizar()
        }
      })
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }

  const handleFinish = async (valores: ValoresBusquedaPDBP) => {
    setCargando(true)

    try {
      await GrupoPeticiones.agregarMovimiento({
        codigo: valores.clave,
        cantidad: 1,
        grupoId: grupo.id,
      })
      setConteoRefresh(conteoRefresh + 1)
      return 1
    } catch {
      // El interceptor de axios ya mostró el error.
      return 0
    } finally {
      setCargando(false)
    }
  }

  const { nombre: grupoNombre, estatus: estatusGrupo } = grupo

  const handleArchivos = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault()
    setMostrarModalArchivos(true)
  }

  const handleComentarios = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault()
    setMostrarModalComentarios(true)
  }

  return (
    <ACL roles={['PREVIO-OPERACION', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Previo" />
      <Encabezado>Previo</Encabezado>
      <Tarjeta
        title={
          <>
            <Row>
              <Col span={12}>
                <Row align="middle">
                  <Col>
                    <Typography.Title style={{ margin: '0', color: 'mediumpurple' }} level={4}>
                      {grupoNombre}
                    </Typography.Title>
                  </Col>
                </Row>
              </Col>
              <Col span={12}>
                <Row justify="end">
                  <Button
                    type={estatusGrupo !== 'inactivo' ? 'default' : 'primary'}
                    danger={estatusGrupo !== 'inactivo'}
                    onClick={estatusGrupo !== 'inactivo' ? handleDisable : handleEnable}
                  >
                    {estatusGrupo !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
                  </Button>
                </Row>
              </Col>
            </Row>
            <Row>
              <Col span={8}>
                <Typography.Title style={{ margin: '0' }} level={5}>
                  Almacenista:
                </Typography.Title>
                <Typography.Title style={{ margin: '0' }} level={5} type="warning">
                  {almacenistaNombre}
                </Typography.Title>
              </Col>
              <Col span={8}>
                <Row justify="center" align="bottom">
                  <Space>
                    <Button type="primary" ghost onClick={handleComentarios}>
                      Comentarios
                    </Button>
                    <Button type="primary" ghost onClick={handleArchivos}>
                      Archivos
                    </Button>
                  </Space>
                </Row>
              </Col>
              <Col span={8} />
            </Row>
          </>
        }
      >
        <FormaBusquedaPDBP
          guardando={cargando}
          handleFinish={handleFinish}
          habilitado={estatusGrupo !== 'inactivo'}
        />

        <TablaOperaciones
          columns={columns}
          fnPeticion={GrupoPeticiones.movimientosPorGrupo}
          titulo="Lista previa"
          grupoId={grupoId}
          conteoRefresh={conteoRefresh}
          cargando={cargando}
          grupoNombre={grupoNombre}
        />
      </Tarjeta>
      <ModalImagenes
        mostrarModal={mostrarModalImagenes}
        cerrarModal={() => {
          setMostrarModalImagenes(false)
        }}
        archivos={archivosImagenes}
      />
      <ModalComentarios
        mostrarModal={mostrarModalComentarios}
        cerrarModal={() => {
          setMostrarModalComentarios(false)
        }}
        comentarios={comentariosGrupo}
        relacion="Grupo"
        relacionId={grupo.id}
        estatus={grupo.estatus}
        fnActualizar={actualizar}
      />
      <ModalArchivos
        mostrarModal={mostrarModalArchivos}
        cerrarModal={() => {
          setMostrarModalArchivos(false)
        }}
        archivos={archivosGrupo}
        relacion="Grupo"
        relacionId={grupo.id}
        estatus={grupo.estatus}
      />
    </ACL>
  )
}

export default PrevioOperacion
