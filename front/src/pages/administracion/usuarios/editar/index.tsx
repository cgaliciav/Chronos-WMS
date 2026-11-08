import { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate, useLocation } from 'react-router'
import { Button, Divider, Row } from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import dayjs from 'dayjs'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { EstadoUsuarioEditar, IdUrl, ManejadorBoton, ValoresFormaUsuario } from '../../tipos'
import FormaUsuario from '../componentes/forma'

const UsuarioEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState<IdUrl>(0)
  const [usuario, setUsuario] = useState<EstadoUsuarioEditar>(() => ({
    nombre: '',
    correo: '',
    vencimiento: new Date(),
    areas: [],
    bodegas: [],
    proyectos: [],
    roles: [],
    estatus: 'inactivo',
  }))
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    setId(typeof uid === 'string' ? uid : 0)
  }, [location])

  useEffect(() => {
    if (id !== 0) {
      setGuardando(true)
      UsuarioPeticiones.obtenerId(id)
        .then(usr => {
          if (usr !== undefined) {
            setUsuario(usr)
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setGuardando(false)
        })
    }
  }, [id])

  const handleFinish = async (values: ValoresFormaUsuario) => {
    try {
      setGuardando(true)
      const respuesta = await UsuarioPeticiones.editar({
        id,
        nombre: values.nombre,
        correo: values.correo,
        rolesIds: values.roles,
        vencimiento: values.fechaVencimiento.format('YYYY-MM-DD HH:mm:ss'),
        proyectosIds: (values.proyectosInternos ?? []).concat(values.proyectosExternos ?? []),
        bodegasIds: values.bodegas,
        areasIds: values.areas,
      })
      if (respuesta !== undefined) {
        navigate('/usuarios/listado')
        notification.success({
          title: 'Actualizado correctamente',
          description: 'El usuario fue actualizado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  const handleEnable: ManejadorBoton = e => {
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
            title: 'Usuario habilitado correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  const handleDisable: ManejadorBoton = e => {
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
            title: 'Usuario deshabilitado correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  const proyectos = usuario.proyectos ?? []

  return (
    <ACL roles={['USUARIO-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar usuario" />
      <Encabezado>Editar Usuario</Encabezado>
      <Tarjeta
        title={
          <Row justify="end">
            <Button
              type={usuario.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={usuario.estatus !== 'inactivo'}
              onClick={usuario.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {usuario.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        }
      >
        <FormaUsuario
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado={usuario.estatus !== 'inactivo'}
          valores={{
            nombre: usuario.nombre,
            correo: usuario.correo,
            fechaVencimiento: dayjs(usuario.vencimiento),
            areas: (usuario.areas ?? []).map(elem => elem.id),
            bodegas: (usuario.bodegas ?? []).map(elem => elem.id),
            proyectosExternos: proyectos.filter(item => item.esExterno).map(elem => elem.id),
            proyectosInternos: proyectos.filter(item => !item.esExterno).map(elem => elem.id),
            roles: (usuario.roles ?? []).map(elem => elem.id),
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default UsuarioEditar
