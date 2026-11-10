import { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate, useLocation } from 'react-router'
import { Button, Divider, Row } from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import AreaPeticiones from 'services/axios/areas'
import type { EstadoAreaEditar, IdUrl, ManejadorBoton, ValoresFormaArea } from '../../tipos'
import FormaArea from '../componentes/forma'

const AreaEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState<IdUrl>(0)
  const [area, setArea] = useState<EstadoAreaEditar>({ nombre: '', estatus: 'inactivo' })
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    setId(typeof uid === 'string' ? uid : 0)
  }, [location])

  useEffect(() => {
    if (id !== 0) {
      setGuardando(true)
      AreaPeticiones.obtenerId(id)
        .then(are => {
          if (are !== undefined) {
            setArea(are)
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setGuardando(false)
        })
    }
  }, [id])

  const handleFinish = async (values: ValoresFormaArea) => {
    try {
      setGuardando(true)
      const respuesta = await AreaPeticiones.editar({
        id,
        nombre: values.nombre,
      })
      if (respuesta !== undefined) {
        navigate('/areas/listado')
        notification.success({
          title: 'Actualizado correctamente',
          description: 'El area fue actualizada correctamente',
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
    AreaPeticiones.habilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoArea } = area
          setArea({
            ...restoArea,
            estatus: 'activo',
          })
          notification.success({
            title: 'Area habilitada correctamente',
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
    AreaPeticiones.inhabilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoArea } = area
          setArea({
            ...restoArea,
            estatus: 'inactivo',
          })
          notification.warning({
            title: 'Area deshabilitada correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  return (
    <ACL roles={['AREA-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar area" />
      <Encabezado>Editar area</Encabezado>
      <Tarjeta
        title={
          <Row justify="end">
            <Button
              type={area.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={area.estatus !== 'inactivo'}
              onClick={area.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {area.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        }
      >
        <FormaArea
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado={area.estatus !== 'inactivo'}
          valores={{
            nombre: area.nombre,
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default AreaEditar
