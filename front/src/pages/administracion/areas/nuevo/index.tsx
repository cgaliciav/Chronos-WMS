import { useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate } from 'react-router'
import { Divider } from 'antd'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import AreaPeticiones from 'services/axios/areas'
import type { ValoresFormaArea } from '../../tipos'
import FormaArea from '../componentes/forma'

const AreaNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async (values: ValoresFormaArea) => {
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

  return (
    <ACL roles={['AREA-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nueva Area" />
      <Encabezado>Nueva Area</Encabezado>
      <Tarjeta>
        <FormaArea handleFinish={handleFinish} guardando={guardando} habilitado />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default AreaNuevo
