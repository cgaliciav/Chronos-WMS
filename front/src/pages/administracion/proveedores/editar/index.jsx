import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate, useLocation } from 'react-router'
import { Button, Divider, Row } from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import ProveedorPeticiones from 'services/axios/proveedores'
import FormaProveedor from '../componentes/forma'

const ProveedorEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState(0)
  const [proveedor, setProveedor] = useState({ nombre: '', RFCEmite: '', estatus: 'inactivo' })
  const navigate = useNavigate()
  const location = useLocation()
  // const params = useParams();
  // setId(params.id);

  useEffect(() => {
    const value = QueryString.parse(location.search.replace('?', ''))
    setId(value.uid)
  }, [location])

  useEffect(() => {
    if (id !== 0) {
      setGuardando(true)
      ProveedorPeticiones.obtenerId(id)
        .then(prv => {
          if (prv !== undefined) {
            setProveedor(prv)
            // console.log(prv)
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

  const handleEnable = e => {
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

  const handleDisable = e => {
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

  // console.log("***********************proveedor",proveedor);
  return (
    <ACL roles={['PROVEEDOR-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar proveedor" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar proveedor</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          <Row justify="end">
            <Button
              type={proveedor.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={proveedor.estatus !== 'inactivo'}
              onClick={proveedor.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {proveedor.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        </div>
        <div className="card-body">
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
        </div>
      </div>
    </ACL>
  )
}

export default ProveedorEditar
