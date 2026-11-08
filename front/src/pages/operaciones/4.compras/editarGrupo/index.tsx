import { idDeEtiquetado } from 'helpers/funcionesExtras'
import { useState, useEffect } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate, useLocation } from 'react-router'
import { Empty } from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'
import type { ValoresConfiguracionGrupo } from 'pages/operaciones/tipos'
import type { FacturaTipo, Grupo, GrupoDetalle, Numerico, Proveedor } from 'types/api'

/** Datos de la factura de una compra (`FacturaDetalle` en el API). */
interface FacturaDetalle {
  id: number
  numero: string
  fechaEmision: string
  total?: Numerico
  impuestos?: Numerico
  montoIngresado?: Numerico
  proveedor?: Proveedor
  facturaTipo?: FacturaTipo
}

/** `GET /groups/:id` de una compra: el detalle del grupo incluye la factura (puede faltar, hallazgo F36). */
interface GrupoCompra extends Omit<Grupo, 'grupoDetalle'> {
  grupoDetalle?: GrupoDetalle & { facturaDetalle?: FacturaDetalle }
}

/**
 * Valores iniciales del formulario a partir del grupo. Tolera un grupo sin `grupoDetalle` o sin `facturaDetalle`
 * (hallazgo F36): los campos que falten quedan vacíos para que el usuario los complete.
 */
function valoresDelGrupo(grupo: GrupoCompra): Partial<ValoresConfiguracionGrupo> {
  const detalle = grupo.grupoDetalle
  const factura = detalle?.facturaDetalle
  return {
    nombre: grupo.nombre,
    proyectoInterno: detalle?.proyecto?.id,
    proveedor: factura?.proveedor
      ? { value: factura.proveedor.id, label: factura.proveedor.nombre }
      : undefined,
    tipoFactura: factura?.facturaTipo?.id,
    fechaInicio: factura?.fechaEmision ? dayjs(factura.fechaEmision) : undefined,
    // antd 5+: los valores de `labelInValue` son `{ value, label }` (antes `{ key, label }`).
    usuariosResponsables: (detalle?.usuarios ?? []).map(usr => ({
      value: usr.id,
      label: usr.nombre,
    })),
  }
}

const CompraEditarGrupo = () => {
  const [guardando, setGuardando] = useState(false)
  const [grupoId, setGrupoId] = useState<number | string>(0)
  /** `null` mientras no hay grupo (cargando, sin `uid` o el API respondió con error). */
  const [grupo, setGrupo] = useState<GrupoCompra | null>(null)
  const [cargando, setCargando] = useState(true)

  const navigate = useNavigate()

  const location = useLocation()

  const buscarGrupo = (id: number | string) => {
    if (id !== 0) {
      setCargando(true)
      GrupoPeticiones.obtenerId(id)
        .then(resp => {
          if (resp !== undefined) {
            setGrupo(resp)
          }
        })
        .catch(() => {})
        .finally(() => {
          setCargando(false)
        })
    }
  }

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    if (typeof uid === 'string') setGrupoId(uid)
    // Sin `uid` no hay nada que cargar: se muestra el aviso de grupo no encontrado.
    else setCargando(false)
  }, [location])

  useEffect(() => {
    buscarGrupo(grupoId)
  }, [grupoId])

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

    const newValues = {
      grupoId,
      numero: nombre,
      proyectoId,
      usuariosIds: usuariosIds.map(idDeEtiquetado),
      fechaEmision,
      total: 0.0,
      impuestos: 0.0,
      montoIngresado: 0.0,
      proveedorId: idDeEtiquetado(proveedorId),
      facturaTipoId,
    }

    try {
      const resp = await GrupoPeticiones.editarConCompra(newValues)

      if (resp !== undefined) {
        // mandar a la edición del grupo
        navigate(`/compras/operacion?uid=${grupoId}`)
        notification.success({
          title: 'Listado editado correctamente',
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
        {cargando && <div style={{ textAlign: 'center' }}>Cargando...</div>}
        {!cargando && grupo === null && (
          <Empty description="No se encontró el listado de compras" />
        )}
        {!cargando && grupo !== null && (
          <FormaConfiguracionGrupo
            handleFinish={handleFinish}
            guardando={guardando}
            mostrarProyectosInternos
            mostrarUsuarios
            mostrarProveedores
            mostrarTipoFactura
            mostrarFechaInicial
            valoresIniciales={valoresDelGrupo(grupo)}
            botonTexto="Editar factura"
            fechaInicialTexto="Fecha factura"
            textoNombre="Número Factura"
          />
        )}
      </Tarjeta>
    </ACL>
  )
}

export default CompraEditarGrupo
