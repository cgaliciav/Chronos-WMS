import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useLocation } from 'react-router-dom'
import { connect } from 'react-redux'
import QueryString from 'query-string'
import { Row, Button, Col, Typography, notification, Space } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import ModalImagenes from 'pages/componentes/modalImagenes'
import FormaBusquedaPDBP from 'pages/operaciones/componentes/formaPDBP'
import TablaOperaciones from 'pages/operaciones/componentes/tablaOperaciones'
import ModalArchivos from 'pages/componentes/modalArchivos'
import ModalComentarios from 'pages/componentes/modalComentarios'
import ColumnasOperaciones from 'pages/operaciones/componentes/columnasTablaOperaciones'

const mapStateToProps = ({ user }) => ({ user })

const BajasAdministradorOperacion = ({ user }) => {
  const [grupoId, setGrupoId] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [conteoRefresh, setConteoRefresh] = useState(0) // utilizado para acutalizar la lista en su vista actual
  const [mostrarModalImagenes, setMostrarModalImagenes] = useState(false)
  const [archivosImagenes, setArchivosImagenes] = useState([])
  const [mostrarModalComentarios, setMostrarModalComentarios] = useState(false)
  const [comentariosGrupo, setComentariosGrupo] = useState([])
  const [mostrarModalArchivos, setMostrarModalArchivos] = useState(false)
  const [archivosGrupo, setArchivosGrupo] = useState([])
  const [grupo, setGrupo] = useState({
    nombre: '',
    estatus: '',
    id: 0,
    grupoDetalle: {
      movimientoTipo: {
        id: 0,
        nombre: '',
      },
      proyecto: {
        id: 0,
        nombre: '',
        estatus: '',
      },
      usuarios: [],
    },
  })

  // ColumnasOperaciones.producto

  const quitarMovimiento = movimientoId => {
    // console.log(movimientoId)
    setCargando(true)
    GrupoPeticiones.quitarMovimiento({
      movimientoId,
    })
      .then(resp => {
        if (resp !== undefined) {
          setConteoRefresh(conteoRefresh + 1) // esto actualiza la lista en su vista actual
          notification.success({
            message: 'Artículo removido de la lista correctamente',
          })
        }
      })
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
    ColumnasOperaciones.funciones((grupo.estatus==="activo")?quitarMovimiento:undefined),
  ]
  // console.log("*************grupo.estatus",grupo.estatus);

  // const history = useHistory()
  const location = useLocation()

  useEffect(() => {
    // console.log('*******************LOCATION', location)
    const value = QueryString.parse(location.search.replace('?', ''))
    // console.log('*******************PARAMS', value);
    setGrupoId(value.uid)
  }, [location])

  useEffect(() => {
    // console.log('*******************GRUPOID', grupoId)
    actualizar()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId])

  const actualizar = () => {
    if (grupoId !== 0) {
      setCargando(true)
      GrupoPeticiones.obtenerId(grupoId)
        .then(resp => {
          if (resp !== undefined) {
            // console.log('GRUPO----------------****', resp)
            setGrupo(resp)
            setComentariosGrupo(resp.comentarios)
            setArchivosGrupo(resp.archivos)
          }
        })
        .finally(() => {
          setCargando(false)
        })
    }
  }

  const handleDisable = e => {
    e.preventDefault()
    setCargando(true)
    GrupoPeticiones.inhabilitar(grupo.id)
      .then(resp => {
        if (resp !== undefined) {
          notification.success({
            message: 'Listado inhabilidato correctamente',
            description: 'Ya no se podrán agregar articulos a la lista',
          })
          actualizar()
        }
      })
      .finally(() => {
        setCargando(false)
      })
  }

  const handleEnable = e => {
    e.preventDefault()
    setCargando(true)
    GrupoPeticiones.habilitar(grupo.id)
      .then(resp => {
        if (resp !== undefined) {
          notification.success({
            message: 'Listado habilitado correctamente',
          })
          actualizar()
        }
      })
      .finally(() => {
        setCargando(false)
      })
  }

  const handleFinish = async valores => {
    // console.log(valores)

    const {
      grupoDetalle: {
        movimientoTipo: { id: movimientoTipoId },
        // proyecto: { id: proyectoId },
        // usuarios,
      },
    } = grupo
    // const usuariosIds = usuarios.map(usr => usr.id)
    setCargando(true)

    const resp=await GrupoPeticiones.agregarMovimiento({
      codigo: valores.clave,
      cantidad: 1,
      movimientoTipoId, // baja administrador
      // proyectoId,
      // usuariosIds,
      grupoId: grupo.id,
    })

    setCargando(false);
    
    if (resp !== undefined) {
      // console.log('ultimoMovimientoAgregado', resp)
      setConteoRefresh(conteoRefresh + 1);
      return 1;
    }
    return 0;
    
  }

  // console.log("GRUPO*******************",grupo);
  const {
    nombre: grupoNombre,
    estatus: estatusGrupo,
    grupoDetalle,
  } = grupo;
  const {
    movimientoTipo: { nombre: movimientoNombre },
    // usuarios,
  }=grupoDetalle;
  // let proyectoNombre="";
  // let estatusProyecto="";
  // if(grupoDetalle.proyecto!==null && grupoDetalle.proyecto!==undefined){
  //   const {proyecto:{nombre:nombreP,estatus:estatusP}}=grupoDetalle;
  //   proyectoNombre=nombreP;
  //   estatusProyecto=estatusP;
  // }


  // const usuariosResponsables = usuarios.map(usr => usr.nombre).join('\n')

  const { nombre: almacenistaNombre } = user


  const handleArchivos = e => {
    e.preventDefault()
    setMostrarModalArchivos(true)
  }


  const handleComentarios = e => {
    e.preventDefault()
    setMostrarModalComentarios(true)
  }

  // console.log('POR AQUI PASA PARA ACTUALIZAR ALGO........................')

  return (
    <ACL roles={['BAJASINRPOYECTO-OPERACION', 'ADMINISTRADOR']} redirect>
      <Helmet title={movimientoNombre} />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">{movimientoNombre}</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          {/* <CabeceraOperacion 
            grupo={grupo}
            handleEnable={handleEnable}
            handleDisable={handleDisable}
          />
           */}
          <Row>
            <Col span={12}>
              <Row align="middle">
                <Col>
                  {/* {proyectoNombre ? (
                    <Typography.Title style={{ margin: '0' }} level={3}>
                      {`${proyectoNombre} ${
                        estatusProyecto !== 'activo' ? `(${estatusProyecto})` : ''
                      }`}{' '}
                      {}{' '}
                    </Typography.Title>
                  ) : null} */}
                  <Typography.Title style={{ margin: '0', color: 'mediumpurple' }} level={4}>
                    {grupoNombre}{' '}
                  </Typography.Title>
                </Col>
              </Row>
            </Col>
            <Col span={12}>
              <Row justify="end" type="flex">
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
              <Row justify="center" align="bottom" type="flex">
                <Space>
                  {/* <Button
                    type="primary"
                    ghost
                    onClick={handleEditar}
                    disabled={estatusGrupo === 'inactivo'}
                  >
                    Editar
                  </Button> */}
                  <Button
                    type="primary"
                    ghost
                    onClick={handleComentarios}
                    // disabled={estatusGrupo === 'inactivo'}
                  >
                    Comentarios
                  </Button>
                  <Button
                    type="primary"
                    ghost
                    onClick={handleArchivos}
                    // disabled={estatusGrupo === 'inactivo'}
                  >
                    Archivos
                  </Button>
                </Space>
              </Row>
            </Col>
            <Col span={8}>
              {/* {usuariosResponsables.length > 0 ? (
                <Row justify="end">
                  <Space size={0} direction="vertical">
                    <Typography.Title style={{ margin: '0' }} level={5}>
                      Usuarios:
                    </Typography.Title>
                    <Typography.Paragraph strong>{usuariosResponsables}</Typography.Paragraph>
                  </Space>
                </Row>
              ) : (
                ''
              )} */}
            </Col>
          </Row>
        </div>
        <div className="card-body">
          <FormaBusquedaPDBP
            guardando={cargando}
            handleFinish={handleFinish}
            habilitado={estatusGrupo !== 'inactivo'}
            // mostrarBajas
          />

          {/* <Divider  /> */}

          {/* <MovimientoCard 
            movimiento={ultimoMovimiento}
          /> */}

          <TablaOperaciones
            columns={columns}
            fnPeticion={GrupoPeticiones.movimientosPorGrupo}
            titulo="Lista de bajas administrador"
            grupoId={grupoId}
            conteoRefresh={conteoRefresh}
            cargando={cargando}
            grupoNombre={grupoNombre}
          />
        </div>
      </div>
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
      {/* <ModalEdicionGrupo mostrarModal={mostrarModalEdicion} cerrarModal={()=>{setMostrarModalEdicion(false)}} comentarios={grupo}  /> */}
    </ACL>
  )
}

export default connect(mapStateToProps)(BajasAdministradorOperacion)
