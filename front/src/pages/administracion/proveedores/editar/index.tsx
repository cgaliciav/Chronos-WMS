import { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate, useLocation } from 'react-router'
import { Button, Divider, Row } from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import ProveedorPeticiones from 'services/axios/proveedores'
import type {
  EstadoProveedorEditar,
  IdUrl,
  ManejadorBoton,
  ValoresFormaProveedor,
} from '../../tipos'
import FormaProveedor from '../componentes/forma'

const ProveedorEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState<IdUrl>(0)
  const [proveedor, setProveedor] = useState<EstadoProveedorEditar>({
    nombre: '',
    RFCEmite: '',
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
      ProveedorPeticiones.obtenerId(id)
        .then(prv => {
          if (prv !== undefined) {
            setProveedor(prv)
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setGuardando(false)
        })
    }
  }, [id])

  const handleFinish = async (values: ValoresFormaProveedor) => {
    try {
      setGuardando(true)
      const respuesta = await ProveedorPeticiones.editar({
        id,
        nombre: values.nombre,
        RFCEmite: values.rfc,
      })
      if (respuesta !== undefined) {
        navigate('/proveedores/listado')
        notification.success({
          title: 'Actualizado correctamente',
          description: 'El proveedor fue actualizado correctamente',
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
    ProveedorPeticiones.habilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoProveedor } = proveedor
          setProveedor({
            ...restoProveedor,
            estatus: 'activo',
          })
          notification.success({
            title: 'proveedor habilitado correctamente',
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
    ProveedorPeticiones.inhabilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoProveedor } = proveedor
          setProveedor({
            ...restoProveedor,
            estatus: 'inactivo',
          })
          notification.warning({
            title: 'proveedor deshabilitado correctamente',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  return (
    <ACL roles={['PROVEEDOR-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar proveedor" />
      <Encabezado>Editar proveedor</Encabezado>
      <Tarjeta
        title={
          <Row justify="end">
            <Button
              type={proveedor.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={proveedor.estatus !== 'inactivo'}
              onClick={proveedor.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {proveedor.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        }
      >
        <FormaProveedor
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado={proveedor.estatus !== 'inactivo'}
          valores={{
            nombre: proveedor.nombre,
            rfc: proveedor.RFCEmite,
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default ProveedorEditar
