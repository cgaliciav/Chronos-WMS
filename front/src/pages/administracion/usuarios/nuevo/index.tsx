import { useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate } from 'react-router'
import { Divider } from 'antd'
import { notification } from 'helpers/feedback'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { ValoresFormaUsuario } from '../../tipos'
import FormaUsuario from '../componentes/forma'

const UsuarioNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async (values: ValoresFormaUsuario) => {
    try {
      setGuardando(true)
      // Antes se hacía `proyectosIds.concat(...)` sin guardar el resultado y siempre se enviaba `[]`.
      const proyectosIds = (values.proyectosInternos ?? []).concat(values.proyectosExternos ?? [])
      const respuesta = await UsuarioPeticiones.nuevo({
        nombre: values.nombre,
        correo: values.correo,
        rolesIds: values.roles,
        vencimiento: values.fechaVencimiento.format('YYYY-MM-DD HH:mm:ss'),
        proyectosIds,
        bodegasIds: values.bodegas,
        areasIds: values.areas,
      })
      if (respuesta !== undefined) {
        navigate('/usuarios/listado')
        notification.success({
          title: 'Creado correctamente',
          description: 'El usuario fue creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ACL roles={['USUARIO-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo usuario" />
      <Encabezado>Nuevo Usuario</Encabezado>
      <Tarjeta>
        <FormaUsuario
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado
          valoresIniciales={{
            fechaVencimiento: dayjs().add(3, 'months'),
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default UsuarioNuevo
