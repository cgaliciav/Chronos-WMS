import { useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate } from 'react-router'
import { Divider } from 'antd'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import ProveedorPeticiones from 'services/axios/proveedores'
import type { ValoresFormaProveedor } from '../../tipos'
import FormaProveedor from '../componentes/forma'

const ProveedorNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async (values: ValoresFormaProveedor) => {
    try {
      setGuardando(true)
      const respuesta = await ProveedorPeticiones.nuevo({
        nombre: values.nombre,
        RFCEmite: values.rfc,
      })
      if (respuesta !== undefined) {
        navigate('/proveedores/listado')
        notification.success({
          title: 'Creado correctamente',
          description: 'El Proveedor fue creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ACL roles={['PROVEEDOR-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo Proveedor" />
      <Encabezado>Nuevo Proveedor</Encabezado>
      <Tarjeta>
        <FormaProveedor
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado
          valoresIniciales={{
            rfc: 'XAXX010101000',
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default ProveedorNuevo
