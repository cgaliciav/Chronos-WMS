import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { Divider } from 'antd'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import AreaPeticiones from 'services/axios/areas'
import FormaArea from '../componentes/forma'

const AreaNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async values => {
    try {
      setGuardando(true)
      const respuesta = await AreaPeticiones.nuevo({
        nombre: values.nombre,
      })
      if (respuesta !== undefined) {
        navigate('/areas/listado')
        notification.success({
          title: 'Creado correctamente',
          description: 'El area fue creada correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  // console.log("***********************BODEGAS",interno,externo)
  return (
    <ACL roles={['AREA-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nueva Area" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nueva Area</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaArea handleFinish={handleFinish} guardando={guardando} habilitado />
          <Divider />
        </div>
      </div>
    </ACL>
  )
}

export default AreaNuevo
