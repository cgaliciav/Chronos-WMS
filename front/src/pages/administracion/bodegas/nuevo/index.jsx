import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { Divider, notification } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import BodegaPeticiones from 'services/axios/bodegas'
import FormaBodega from '../componentes/forma'

const BodegaNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async values => {
    try {
      setGuardando(true)
      const respuesta = await BodegaPeticiones.nuevo({
        nombre: values.nombre,
        descripcion: values.descripcion,
        cobacha: false,
      })
      if (respuesta !== undefined) {
        navigate('/bodegas/listado')
        notification.success({
          message: 'Creado correctamente',
          description: 'El almacén fue creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  // console.log("***********************area",area);
  return (
    <ACL roles={['BODEGA-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo almacén" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo almacén</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaBodega
            handleFinish={handleFinish}
            guardando={guardando}
            habilitado
            valoresIniciales={{
              descripcion: '-',
            }}
          />
          <Divider />
        </div>
      </div>
    </ACL>
  )
}

export default BodegaNuevo
