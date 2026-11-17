import { idDeEtiquetado } from 'helpers/funcionesExtras'
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
import { MOVIMIENTO_TIPO } from 'types/api'

/** Nuevo listado de transformaciones (decisión 20): la producción que transforma y sus responsables. */
const TransformacionesNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate()

  const handleFinish = async (values: ValoresConfiguracionGrupo) => {
    const { nombre, proyectoInterno: proyectoId, usuariosResponsables: usuariosIds = [] } = values
    setGuardando(true)

    try {
      const resp = await GrupoPeticiones.nuevoConDetalles({
        nombre,
        proyectoId,
        movimientoTipoId: MOVIMIENTO_TIPO.TRANSFORMACION,
        usuariosIds: usuariosIds.map(idDeEtiquetado),
      })
      if (resp !== undefined) {
        navigate(`/transformaciones/operacion?uid=${resp.id}`)
        notification.success({ title: 'Listado creado correctamente' })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }

    setGuardando(false)
  }

  return (
    <ACL roles={['GRUPOS-TRANSFORMAR', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de transformaciones" />
      <Encabezado>Nuevo listado de transformaciones</Encabezado>
      <Tarjeta>
        <FormaConfiguracionGrupo
          handleFinish={handleFinish}
          guardando={guardando}
          mostrarProyectosInternos
          mostrarUsuarios
          valoresIniciales={{ nombre: dayjs().format('x') }}
          botonTexto="Crear listado"
          prefijoMovimiento="T"
        />
      </Tarjeta>
    </ACL>
  )
}

export default TransformacionesNuevo
