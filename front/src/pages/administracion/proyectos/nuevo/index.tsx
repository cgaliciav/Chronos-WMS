import { useState } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate } from 'react-router'
import { Divider } from 'antd'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import dayjs from 'dayjs'
import ProyectoPeticiones from 'services/axios/proyectos'
import type { ValoresFormaProyecto } from '../../tipos'
import FormaProyecto from '../componentes/forma'

const ProyectoNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async (values: ValoresFormaProyecto) => {
    try {
      setGuardando(true)
      const respuesta = await ProyectoPeticiones.nuevo({
        nombre: values.nombre,
        descripcion: values.descripcion,
        fechaInicio: values.fecha.format('YYYY-MM-DD HH:mm:ss'),
        productor: values.productor,
        esExterno: values.tipoProyecto === 'externo',
      })
      if (respuesta !== undefined) {
        navigate('/proyectos/listado')
        notification.success({
          title: 'Creado correctamente',
          description: 'El proyecto fue creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ACL roles={['PROYECTO-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo proyecto" />
      <Encabezado>Nuevo Proyecto</Encabezado>
      <Tarjeta>
        <FormaProyecto
          handleFinish={handleFinish}
          guardando={guardando}
          habilitado
          valoresIniciales={{
            productor: '.',
            fecha: dayjs(),
            descripcion: '-',
            tipoProyecto: 'interno',
          }}
        />
        <Divider />
      </Tarjeta>
    </ACL>
  )
}

export default ProyectoNuevo
