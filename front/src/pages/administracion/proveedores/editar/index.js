import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory, useLocation } from 'react-router-dom'
import { Button, Divider, notification, Row } from 'antd'
import QueryString from 'query-string'
import ACL from 'components/cleanui/system/ACL'
import ProveedorPeticiones from 'services/axios/proveedores'
import FormaProveedor from '../componentes/forma'

const ProveedorEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState(0)
  const [proveedor, setProveedor] = useState({ nombre: '', RFCEmite: '', estatus: 'inactivo' })
  const history = useHistory()
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
        history.push('/proveedores/listado')
        notification.success({
          message: 'Actualizado correctamente',
          description: 'El proveedor fue actualizado correctamente',
        })
      }
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
            message: 'proveedor habilitado correctamente',
          })
        }
      })
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
            message: 'proveedor deshabilitado correctamente',
          })
        }
      })
      .finally(() => {
        setGuardando(false)
      })
  }

  // console.log("***********************proveedor",proveedor);
  return (
    <ACL roles={['PROVEEDOR-EDITAR', 'ADMINISTRADOR']} redirect>
      <Helmet title="Editar proveedor" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar proveedor</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          <Row justify="end" type="flex">
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
