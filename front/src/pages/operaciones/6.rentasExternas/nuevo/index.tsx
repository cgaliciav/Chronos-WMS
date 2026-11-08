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

const RentasNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate()

  const handleFinish = async (values: ValoresConfiguracionGrupo) => {
    const { nombre, proyectoExterno: proyectoId, usuariosResponsables: usuariosIds = [] } = values
    setGuardando(true)

    try {
      const resp = await GrupoPeticiones.nuevoConDetalles({
        nombre,
        proyectoId,
        movimientoTipoId: 11, // renta externa
        usuariosIds: usuariosIds.map(usr => usr.key),
      })
      if (resp !== undefined) {
        // mandar a la edición del grupo
        navigate(`/renta-externa/operacion?uid=${resp.id}`)
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
    <ACL roles={['RENTAEXTERNA-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de bajas" />
      <Encabezado>Nuevo listado de renta externa</Encabezado>
      <Tarjeta>
        <FormaConfiguracionGrupo
          handleFinish={handleFinish}
          guardando={guardando}
          mostrarProyectosExternos
          mostrarUsuarios
          valoresIniciales={{ nombre: dayjs().format('x') }}
          botonTexto="Crear renta externa"
          prefijoMovimiento="R"
        />
      </Tarjeta>
    </ACL>
  )
}

export default RentasNuevo
