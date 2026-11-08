import { useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'
import type { ValoresConfiguracionGrupo } from 'pages/operaciones/tipos'

const DevolucionesNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate()

  const handleFinish = async (values: ValoresConfiguracionGrupo) => {
    const { nombre, proyectoInterno: proyectoId, usuariosResponsables: usuariosIds = [] } = values
    setGuardando(true)

    try {
      const resp = await GrupoPeticiones.nuevoConDetalles({
        nombre,
        proyectoId,
        movimientoTipoId: 4, // devolucion
        usuariosIds: usuariosIds.map(usr => usr.key),
      })
      if (resp !== undefined) {
        // mandar a la edicion del grupo
        navigate(`/devoluciones/operacion?uid=${resp.id}`)
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
    <ACL roles={['DEVOLUCION-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de devolución" />
      <Encabezado>Nuevo listado de devoluciones</Encabezado>
      <Tarjeta>
        <FormaConfiguracionGrupo
          handleFinish={handleFinish}
          guardando={guardando}
          mostrarProyectosInternos
          mostrarUsuarios
          valoresIniciales={{ nombre: dayjs().format('x') }}
          botonTexto="Crear devolución"
          prefijoMovimiento="D"
        />
      </Tarjeta>
    </ACL>
  )
}

export default DevolucionesNuevo
