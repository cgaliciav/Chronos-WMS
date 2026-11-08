import { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { notification } from 'helpers/feedback'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'
import type { ValoresConfiguracionGrupo } from 'pages/operaciones/tipos'

const PrevioNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate()

  const handleFinish = async (values: ValoresConfiguracionGrupo) => {
    const { nombre } = values
    setGuardando(true)

    try {
      const resp = await GrupoPeticiones.nuevo({
        nombre,
      })
      if (resp !== undefined) {
        // mandar a la edición del grupo
        navigate(`/previo/operacion?uid=${resp.id}`)
        notification.success({
          title: 'Listado creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }
    setGuardando(false)
  }

  return (
    <ACL roles={['PREVIO-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de previo" />
      <Encabezado>Nuevo listado de previo</Encabezado>
      <Tarjeta>
        <FormaConfiguracionGrupo
          handleFinish={handleFinish}
          guardando={guardando}
          valoresIniciales={{ nombre: dayjs().format('x') }}
          botonTexto="Crear"
        />
      </Tarjeta>
    </ACL>
  )
}

export default PrevioNuevo
