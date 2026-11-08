import { useEffect, useState } from 'react'
import { Divider } from 'antd'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { guardarJSON, leerJSON } from 'helpers/storage'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import CatalogoResultados from '../componentes/catalogoResultados'
import type {
  BusquedaPorProyecto,
  InventarioCatalogo,
  PaginacionCatalogo,
  ParametrosCatalogo,
} from '../tipos'
import FormaBusquedaPorFactura from './componentes/forma'

const CatalogoGeneral = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState<PaginacionCatalogo>({
    current: 1,
    total: 0,
    pageSize: 12,
  })
  const [busqueda, setBusqueda] = useState<BusquedaPorProyecto>({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    proyecto: [],
  })
  const [data, setData] = useState<InventarioCatalogo[]>([])

  useEffect(() => {
    const tempBusqueda = leerJSON<BusquedaPorProyecto | null>('catalogoFacturas.busqueda', null)
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

    const tempPaginacion = leerJSON<PaginacionCatalogo | null>('catalogoFacturas.pagination', null)
    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }
  }, [])

  const handleFinish = (values: BusquedaPorProyecto) => {
    setBusqueda({ ...values })
  }

  const onChange = (pagina: number, paginaTamanio: number) => {
    const { current, pageSize, ...restPagination } = pagination
    const tempPaginacion = {
      current: pagina,
      pageSize: paginaTamanio,
      ...restPagination,
    }

    setPagination({ ...tempPaginacion })
    buscar({
      pagination: tempPaginacion,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      proyectoId: busqueda.proyecto,
    })
  }

  const onShowSizeChange = (_actual: number, paginaTamanio: number) => {
    const { current, pageSize, ...restPagination } = pagination

    const actual = Math.ceil((pageSize * current) / paginaTamanio)
    const tempPaginacion = {
      current: actual,
      pageSize: paginaTamanio,
      ...restPagination,
    }
    setPagination({ ...tempPaginacion })
    buscar({
      pagination: tempPaginacion,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      proyectoId: busqueda.proyecto,
    })
  }

  useEffect(() => {
    guardarJSON('catalogoFacturas.busqueda', busqueda)

    // Antes comprobaba `busqueda.estado`, que esta búsqueda no tiene: con áreas y almacenes elegidos
    // `busqueda.estado.length` lanzaba un TypeError y la página se rompía al buscar.
    const { areas, bodegas } = busqueda
    if (areas === null || areas === undefined || bodegas === null || bodegas === undefined) {
      return
    }
    if (areas.length === 0 || bodegas.length === 0) {
      return
    }

    buscar({
      pagination,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: areas,
      bodegaIds: bodegas,
      proyectoId: busqueda.proyecto,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const buscar = (params: ParametrosCatalogo = {}) => {
    setCargando(true)

    guardarJSON('catalogoFacturas.pagination', params.pagination)

    // F25: llama a `list-catalog-project` en vez de `list-catalog-invoices` (pendiente; ruta fuera del menú).
    InventarioAcualPeticiones.listadoCatalogoProyectos({
      ...params,
    })
      .then(respData => {
        if (respData !== undefined) {
          setData(respData.results)
          setPagination(respData.pagination)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-FACTURAS']} redirect>
      <Titulo texto="Catálogo por Factura" />
      <Encabezado>Catálogo por Factura</Encabezado>
      <Tarjeta>
        <FormaBusquedaPorFactura cargando={cargando} handleFinish={handleFinish} />
      </Tarjeta>
      <Divider />

      <CatalogoResultados
        data={data}
        cargando={cargando}
        onChange={onChange}
        onShowSizeChange={onShowSizeChange}
        pagination={pagination}
      />
    </ACL>
  )
}

export default CatalogoGeneral
