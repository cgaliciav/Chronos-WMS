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

// Página sin ruta en `router.tsx` (huérfana).
const InventarioNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate()

  const handleFinish = async (values: ValoresConfiguracionGrupo) => {
    const { nombre, bodega: bodegaId, fechaInicio } = values
    setGuardando(true)

    try {
      const resp = await GrupoPeticiones.nuevoConInventario({
        nombre,
        fechaInicio: fechaInicio?.format('YYYY-MM-DD HH:mm:ss'),
        bodegaId,
        movimientoTipoId: 15, // compra
      })

      if (resp !== undefined) {
        // mandar a la edicion del grupo
        navigate(`/compras/operacion?uid=${resp.id}`)
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
    <ACL roles={['INVENTARIOS-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de inventarios" />
      <Encabezado>Nuevo listado de inventarios</Encabezado>
      <Tarjeta>
        <FormaConfiguracionGrupo
          handleFinish={handleFinish}
          guardando={guardando}
          mostrarFechaInicial
          mostrarBodega
          valoresIniciales={{ nombre: dayjs().format('x') }}
          botonTexto="Crear inventario"
        />
      </Tarjeta>
    </ACL>
  )
}

export default InventarioNuevo
