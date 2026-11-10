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
import ProyectoPeticiones from 'services/axios/proyectos'
import type { EstadoProyectoEditar, IdUrl, ManejadorBoton, ValoresFormaProyecto } from '../../tipos'
import FormaProyecto from '../componentes/forma'

const ProyectoEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState<IdUrl>(0)
  const [proyecto, setProyecto] = useState<EstadoProyectoEditar>(() => ({
    nombre: '',
    descripcion: '',
    productor: '',
    fechaInicio: new Date(),
    esExterno: false,
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
      ProyectoPeticiones.obtenerId(id)
        .then(pry => {
          if (pry !== undefined) {
            setProyecto(pry)
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setGuardando(false)
        })
    }
  }, [id])

  const handleFinish = async (values: ValoresFormaProyecto) => {
    try {
      setGuardando(true)
      const respuesta = await ProyectoPeticiones.editar({
        id,
        nombre: values.nombre,
        descripcion: values.descripcion,
        fechaInicio: values.fecha.format('YYYY-MM-DD HH:mm:ss'),
        productor: values.productor,
        esExterno: values.tipoProyecto === 'externo',
      })
      if (respuesta !== undefined) {
        navigate('/proyectos/listado')
        notification.success({
          title: 'Actualizado correctamente',
          description: 'El proyecto fue actualizado correctamente',
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
    ProyectoPeticiones.habilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoProyecto } = proyecto
          setProyecto({
            ...restoProyecto,
            estatus: 'activo',
          })
          notification.success({
            title: 'Proyecto habilitado correctamente',
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
    ProyectoPeticiones.inhabilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoProyecto } = proyecto
          setProyecto({
            ...restoProyecto,
            estatus: 'inactivo',
          })
          notification.warning({
            title: 'Proyecto deshabilitado correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  return (
    <ACL roles={['PROYECTO-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo usuario" />
      <Encabezado>Editar Proyecto</Encabezado>
      <Tarjeta
        title={
          <Row justify="end">
            <Button
              type={proyecto.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={proyecto.estatus !== 'inactivo'}
              onClick={proyecto.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {proyecto.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        }
      >
        <FormaProyecto
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado={proyecto.estatus !== 'inactivo'}
          valores={{
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion,
            fecha: dayjs(proyecto.fechaInicio),
            productor: proyecto.productor,
            tipoProyecto: proyecto.esExterno ? 'externo' : 'interno',
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default ProyectoEditar
