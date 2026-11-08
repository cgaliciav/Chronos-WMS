import { useState } from 'react'
import type { Key } from 'react'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import TablaListadosPorProyecto from 'pages/operaciones/componentes/tablaListadosPorProyecto'
import FormaBusquedaPorProyecto from 'pages/operaciones/componentes/formaBusquedaPorProyecto'
import ColumnasOperaciones from 'pages/operaciones/componentes/columnasTablaOperaciones'
import ModalImagenes from 'pages/componentes/modalImagenes'
import type { ValoresBusquedaPorProyecto } from 'pages/operaciones/tipos'
import type { Archivo } from 'types/api'

const PrestamosListadoPorProyecto = () => {
  const [proyectoId, setProyectoId] = useState<number | undefined>(0)
  const [usuariosIds, setUsuariosIds] = useState<Key[]>([])
  const [areasIds, setAreasIds] = useState<number[] | undefined>([])
  const [bodegasIds, setBodegasIds] = useState<number[] | undefined>([])
  const [archivosImagenes, setArchivosImagenes] = useState<Archivo[]>([])
  const [mostrarModalImagenes, setMostrarModalImagenes] = useState(false)
  const [conteoRefresh, setConteoRefresh] = useState(0)

  const columns = [
    ColumnasOperaciones.foto(setArchivosImagenes, setMostrarModalImagenes),
    ColumnasOperaciones.producto,
    ColumnasOperaciones.clave,
    ColumnasOperaciones.almacen,
    ColumnasOperaciones.operacion,
    ColumnasOperaciones.almacenista,
    ColumnasOperaciones.funciones(),
  ]

  const handleFinish = (valores: ValoresBusquedaPorProyecto) => {
    const { proyectoInterno, usuarios, areas, bodegas } = valores

    setProyectoId(proyectoInterno)
    setUsuariosIds(
      usuarios ? usuarios.map(usuario => usuario.value).filter(valor => valor !== undefined) : [],
    )
    setAreasIds(areas)
    setBodegasIds(bodegas)
    setConteoRefresh(conteoRefresh + 1)
  }

  return (
    <ACL roles={['V-OPERACION-PRESTAMOPORPROYECTO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Listado Préstamos" />
      <Encabezado>Listados Préstamos Por Proyecto</Encabezado>
      <Tarjeta>
        <FormaBusquedaPorProyecto
          mostrarProyectosInternos
          mostrarAreas
          mostrarBodegas
          mostrarUsuarios
          handleFinish={handleFinish}
          cargando={false}
          habilitado
        />
        <TablaListadosPorProyecto
          columns={columns}
          fnPeticion={GrupoPeticiones.listadoPorProyecto}
          movimientoTipoId={3}
          proyectoId={proyectoId}
          usuariosIds={usuariosIds}
          areasIds={areasIds}
          bodegasIds={bodegasIds}
          titulo="Préstamos"
          conteoRefresh={conteoRefresh}
          movimientoTipoNombre="PRESTAMOS"
          activos={false}
        />
      </Tarjeta>
      <ModalImagenes
        mostrarModal={mostrarModalImagenes}
        cerrarModal={() => {
          setMostrarModalImagenes(false)
        }}
        archivos={archivosImagenes}
      />
    </ACL>
  )
}

export default PrestamosListadoPorProyecto
