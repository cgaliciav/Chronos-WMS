import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { Divider, notification } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import ProveedorPeticiones from 'services/axios/proveedores'
import FormaProveedor from '../componentes/forma'

const ProveedorNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async values => {
    try {
      setGuardando(true)
      // console.log('*******************************FINISH', values)
      const respuesta = await ProveedorPeticiones.nuevo({
        nombre: values.nombre,
        RFCEmite: values.rfc,
      })
      if (respuesta !== undefined) {
        // console.log('*******************************Proveedor GUARDADO', respuesta)
        navigate('/proveedores/listado')
        notification.success({
          message: 'Creado correctamente',
          description: 'El Proveedor fue creado correctamente',
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
    <ACL roles={['PROVEEDOR-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo Proveedor" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo Proveedor</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaProveedor
            handleFinish={handleFinish}
            guardando={guardando}
            habilitado
            valoresIniciales={{
              rfc: 'XAXX010101000',
            }}
          />
          <Divider />
        </div>
      </div>
    </ACL>
  )
}

export default ProveedorNuevo
