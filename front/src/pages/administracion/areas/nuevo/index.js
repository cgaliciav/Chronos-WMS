import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory } from 'react-router-dom'
import { Divider, notification } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import AreaPeticiones from 'services/axios/areas'
import FormaArea from '../componentes/forma'

const AreaNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const history = useHistory()

  const handleFinish = async values => {
    try {
      setGuardando(true)
      const respuesta = await AreaPeticiones.nuevo({
        nombre: values.nombre,
      })
      if (respuesta !== undefined) {
        history.push('/areas/listado')
        notification.success({
          message: 'Creado correctamente',
          description: 'El area fue creada correctamente',
        })
      }
    } finally {
      setGuardando(false)
    }
  }

  // console.log("***********************BODEGAS",interno,externo)
  return (
    <ACL roles={['AREA-NUEVO', 'ADMINISTRADOR']} redirect>
      <Helmet title="Nueva Area" />
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
