import { idDeEtiquetado } from 'helpers/funcionesExtras'
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

const CompraNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate()

  const handleFinish = async (values: ValoresConfiguracionGrupo) => {
    const {
      nombre,
      proyectoInterno: proyectoId,
      proveedor: proveedorId,
      tipoFactura: facturaTipoId,
      fechaInicio: fechaEmision,
      usuariosResponsables: usuariosIds = [],
    } = values
    setGuardando(true)

    try {
      const resp = await GrupoPeticiones.nuevoConCompra({
        nombre,
        numero: nombre,
        movimientoTipoId: 15, // compra
        proyectoId,
        usuariosIds: usuariosIds.map(idDeEtiquetado),
        fechaEmision,
        total: 0.0,
        impuestos: 0.0,
        montoIngresado: 0.0,
        proveedorId: idDeEtiquetado(proveedorId),
        facturaTipoId,
      })

      if (resp !== undefined) {
        // mandar a la edición del grupo
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
    <ACL roles={['COMPRAS-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de compras" />
      <Encabezado>Nuevo listado de compras</Encabezado>
      <Tarjeta>
        <FormaConfiguracionGrupo
          handleFinish={handleFinish}
          guardando={guardando}
          mostrarProyectosInternos
          mostrarUsuarios
          mostrarProveedores
          mostrarTipoFactura
          mostrarFechaInicial
          valoresIniciales={{ nombre: dayjs().format('x') }}
          botonTexto="Crear factura"
          fechaInicialTexto="Fecha factura"
          textoNombre="Número Factura"
          prefijoMovimiento="C"
        />
      </Tarjeta>
    </ACL>
  )
}

export default CompraNuevo
