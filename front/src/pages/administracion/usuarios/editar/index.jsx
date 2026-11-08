import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate, useLocation } from 'react-router'
import { Button, Divider, notification, Row } from 'antd'
import QueryString from 'query-string'
import ACL from 'components/cleanui/system/ACL'
import moment from 'moment'
import UsuarioPeticiones from 'services/axios/usuarios'
import FormaUsuario from '../componentes/forma'

const UsuarioEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState(0)
  const [usuario, setUsuario] = useState({
    nombre: '',
    correo: '',
    vencimiento: new Date(),
    areas: [],
    bodegas: [],
    proyectos: [],
    roles: [],
    estatus: 'inactivo',
  })
  const navigate = useNavigate()
  const location = useLocation()
  // const params = useParams();
  // setId(params.id);

  useEffect(() => {
    // console.log('*******************LOCATION', location);
    const value = QueryString.parse(location.search.replace('?', ''))
    // console.log('*******************PARAMS', value);
    setId(value.uid)
  }, [location])

  useEffect(() => {
    if (id !== 0) {
      setGuardando(true)
      UsuarioPeticiones.obtenerId(id)
        .then(usr => {
          if (usr !== undefined) {
            setUsuario(usr)
            // console.log(usr)
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setGuardando(false)
        })
    }
  }, [id])

  const handleFinish = async values => {
    try {
      setGuardando(true)
      // console.log("*******************************FINISH",values);
      const proyectosIds = []
      if (values.proyectosInternos) {
        proyectosIds.concat(values.proyectosInternos)
      }
      if (values.proyectosExternos) {
        proyectosIds.concat(values.proyectosExternos)
      }
      const respuesta = await UsuarioPeticiones.editar({
        id,
        nombre: values.nombre,
        correo: values.correo,
        rolesIds: values.roles,
        vencimiento: values.fechaVencimiento.format('YYYY-MM-DD HH:mm:ss'),
        proyectosIds: values.proyectosInternos.concat(values.proyectosExternos),
        bodegasIds: values.bodegas,
        areasIds: values.areas,
      })
      if (respuesta !== undefined) {
        // console.log("*******************************USUARIO GUARDADO",respuesta);
        navigate('/usuarios/listado')
        notification.success({
          message: 'Actualizado correctamente',
          description: 'El usuario fue actualizado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  const handleEnable = e => {
    e.preventDefault()
    setGuardando(true)
    UsuarioPeticiones.habilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoUsuario } = usuario
          setUsuario({
            ...restoUsuario,
            estatus: 'activo',
          })
          notification.success({
            message: 'Usuario habilitado correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  const handleDisable = e => {
    e.preventDefault()
    setGuardando(true)
    UsuarioPeticiones.inhabilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoUsuario } = usuario
          setUsuario({
            ...restoUsuario,
            estatus: 'inactivo',
          })
          notification.warning({
            message: 'Usuario deshabilitado correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  // console.log("***********************USUARIO",usuario);
  return (
    <ACL roles={['USUARIO-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar usuario" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar Usuario</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          <Row justify="end" type="flex">
            <Button
              type={usuario.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={usuario.estatus !== 'inactivo'}
              onClick={usuario.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {usuario.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        </div>
        <div className="card-body">
          <FormaUsuario
            handleFinish={handleFinish}
            guardando={guardando}
            habilitado={usuario.estatus !== 'inactivo'}
            valores={{
              nombre: usuario.nombre,
              correo: usuario.correo,
              fechaVencimiento: moment(usuario.vencimiento),
              areas: usuario.areas.map(elem => elem.id),
              bodegas: usuario.bodegas.map(elem => elem.id),
              proyectosExternos: usuario.proyectos
                .filter(item => item.esExterno)
                .map(elem => elem.id),
              proyectosInternos: usuario.proyectos
                .filter(item => !item.esExterno)
                .map(elem => elem.id),
              roles: usuario.roles.map(elem => elem.id),
            }}
          />
          <Divider />
        </div>
      </div>
    </ACL>
  )
}

export default UsuarioEditar
