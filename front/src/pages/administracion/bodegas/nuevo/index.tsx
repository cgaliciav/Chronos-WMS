import { useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate } from 'react-router'
import { Divider } from 'antd'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import BodegaPeticiones from 'services/axios/bodegas'
import type { ValoresFormaBodega } from '../../tipos'
import FormaBodega from '../componentes/forma'

const BodegaNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async (values: ValoresFormaBodega) => {
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
          title: 'Creado correctamente',
          description: 'El almacén fue creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ACL roles={['BODEGA-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo almacén" />
      <Encabezado>Nuevo almacén</Encabezado>
      <Tarjeta>
        <FormaBodega
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado
          valoresIniciales={{
            descripcion: '-',
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default BodegaNuevo
