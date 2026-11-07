import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory, useLocation } from 'react-router-dom'
import { Button, Divider, notification, Row } from 'antd'
import QueryString from 'query-string'
import ACL from 'components/cleanui/system/ACL'
import AreaPeticiones from 'services/axios/areas'
import FormaArea from '../componentes/forma'

const AreaEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState(0)
  const [area, setArea] = useState({ nombre: '', estatus: 'inactivo' })
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
      AreaPeticiones.obtenerId(id)
        .then(are => {
          if (are !== undefined) {
            setArea(are)
            // console.log(are)
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
      const respuesta = await AreaPeticiones.editar({
        id,
        nombre: values.nombre,
      })
      if (respuesta !== undefined) {
        history.push('/areas/listado')
        notification.success({
          message: 'Actualizado correctamente',
          description: 'El area fue actualizada correctamente',
        })
      }
    } finally {
      setGuardando(false)
    }
  }

  const handleEnable = e => {
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
            message: 'Area habilitada correctamente',
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
    AreaPeticiones.inhabilitar(id)
      .then(resp => {
        if (resp !== undefined) {
          const { estatus, ...restoArea } = area
          setArea({
            ...restoArea,
            estatus: 'inactivo',
          })
          notification.warning({
            message: 'Area deshabilitada correctamente',
          })
        }
      })
      .finally(() => {
        setGuardando(false)
      })
  }

  // console.log("***********************area",area);
  return (
    <ACL roles={['AREA-EDITAR', 'ADMINISTRADOR']} redirect>
      <Helmet title="Editar area" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar area</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          <Row justify="end" type="flex">
            <Button
              type={area.estatus !== 'inactivo' ? 'default' : 'primary'}
              danger={area.estatus !== 'inactivo'}
              onClick={area.estatus !== 'inactivo' ? handleDisable : handleEnable}
            >
              {area.estatus !== 'inactivo' ? 'Deshabilitar' : 'Habilitar'}
            </Button>
          </Row>
        </div>
        <div className="card-body">
          <FormaArea
            handleFinish={handleFinish}
            guardando={guardando}
            habilitado={area.estatus !== 'inactivo'}
            valores={{
              nombre: area.nombre,
            }}
          />
          <Divider />
        </div>
      </div>
    </ACL>
  )
}

export default AreaEditar
