import { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate, useLocation } from 'react-router'
import { Button, Divider, Row } from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import BodegaPeticiones from 'services/axios/bodegas'
import type { EstadoBodegaEditar, IdUrl, ManejadorBoton, ValoresFormaBodega } from '../../tipos'
import FormaBodega from '../componentes/forma'

const BodegaEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState<IdUrl>(0)
  const [bodega, setBodega] = useState<EstadoBodegaEditar>({
    nombre: '',
    descripcion: '',
    estatus: 'inactivo',
  })
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    setId(typeof uid === 'string' ? uid : 0)
  }, [location])

  useEffect(() => {
    if (id !== 0) {
      setGuardando(true)
      BodegaPeticiones.obtenerId(id)
        .then(bod => {
          if (bod !== undefined) {
            setBodega(bod)
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setGuardando(false)
        })
    }
  }, [id])

  const handleFinish = async (values: ValoresFormaBodega) => {
    try {
      setGuardando(true)
      const respuesta = await BodegaPeticiones.editar({
        id,
        nombre: values.nombre,
        descripcion: values.descripcion,
        cobacha: false,
      })
      if (respuesta !== undefined) {
        navigate('/bodegas/listado')
        notification.success({
          title: 'Actualizado correctamente',
          description: 'El almacén fue actualizado correctamente',
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
    BodegaPeticiones.habilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoBodega } = bodega
          setBodega({
            ...restoBodega,
            estatus: 'activo',
          })
          notification.success({
            title: 'Almacén habilitado correctamente',
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
    BodegaPeticiones.inhabilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoBodega } = bodega
          setBodega({
            ...restoBodega,
            estatus: 'inactivo',
          })
          notification.warning({
            title: 'Almacén deshabilitado correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  return (
    <ACL roles={['BODEGA-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar almacén" />
      <Encabezado>Editar almacén</Encabezado>
      <Tarjeta
        title={
          <Row justify="end">
            <Button
              type={bodega.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={bodega.estatus !== 'inactivo'}
              onClick={bodega.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {bodega.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        }
      >
        <FormaBodega
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado={bodega.estatus !== 'inactivo'}
          valores={{
            nombre: bodega.nombre,
            descripcion: bodega.descripcion,
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default BodegaEditar
