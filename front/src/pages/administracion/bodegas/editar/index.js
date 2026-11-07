import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory, useLocation } from 'react-router-dom'
import { Button, Divider, notification, Row } from 'antd'
import QueryString from 'query-string'
import ACL from 'components/cleanui/system/ACL'
import BodegaPeticiones from 'services/axios/bodegas'
import FormaBodega from '../componentes/forma'

const BodegaEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState(0)
  const [bodega, setBodega] = useState({ nombre: '', descripcion: '', estatus: 'inactivo' })
  const history = useHistory()
  const location = useLocation()

  useEffect(() => {
    const value = QueryString.parse(location.search.replace('?', ''))
    setId(value.uid)
  }, [location])

  useEffect(() => {
    if (id !== 0) {
      setGuardando(true)
      BodegaPeticiones.obtenerId(id)
        .then(bod => {
          if (bod !== undefined) {
            setBodega(bod)
            console.log(bod)
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
      const respuesta = await BodegaPeticiones.editar({
        id,
        nombre: values.nombre,
        descripcion: values.descripcion,
        cobacha: false,
      })
      if (respuesta !== undefined) {
        history.push('/bodegas/listado')
        notification.success({
          message: 'Actualizado correctamente',
          description: 'El almacén fue actualizado correctamente',
        })
      }
    } finally {
      setGuardando(false)
    }
  }

  const handleEnable = e => {
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
            message: 'Almacén habilitado correctamente',
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
    BodegaPeticiones.inhabilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoBodega } = bodega
          setBodega({
            ...restoBodega,
            estatus: 'inactivo',
          })
          notification.warning({
            message: 'Almacén deshabilitado correctamente',
          })
        }
      })
      .finally(() => {
        setGuardando(false)
      })
  }

  // console.log("***********************bodega",bodega);
  return (
    <ACL roles={['BODEGA-EDITAR', 'ADMINISTRADOR']} redirect>
      <Helmet title="Editar almacén" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar almacén</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          <Row justify="end" type="flex">
            <Button
              type={bodega.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={bodega.estatus !== 'inactivo'}
              onClick={bodega.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {bodega.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        </div>
        <div className="card-body">
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
        </div>
      </div>
    </ACL>
  )
}

export default BodegaEditar
