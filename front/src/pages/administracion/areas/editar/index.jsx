import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate, useLocation } from 'react-router'
import { Button, Divider, Row } from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import ACL from 'components/cleanui/system/ACL'
import AreaPeticiones from 'services/axios/areas'
import FormaArea from '../componentes/forma'

const AreaEditar = () => {
  const [guardando, setGuardando] = useState(false)
  const [id, setId] = useState(0)
  const [area, setArea] = useState({ nombre: '', estatus: 'inactivo' })
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
      AreaPeticiones.obtenerId(id)
        .then(are => {
          if (are !== undefined) {
            setArea(are)
            // console.log(are)
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
            title: 'Area habilitada correctamente',
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

  // console.log("***********************area",area);
  return (
    <ACL roles={['AREA-EDITAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar area" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar area</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          <Row justify="end">
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
