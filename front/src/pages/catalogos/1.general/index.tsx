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
  BusquedaGeneral,
  InventarioCatalogo,
  PaginacionCatalogo,
  ParametrosCatalogo,
} from '../tipos'
import FormaBusquedaGeneral from './componentes/forma'

const CatalogoGeneral = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState<PaginacionCatalogo>({
    current: 1,
    total: 0,
    pageSize: 12,
  })
  const [busqueda, setBusqueda] = useState<BusquedaGeneral>({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    estado: [],
  })
  const [data, setData] = useState<InventarioCatalogo[]>([])

  useEffect(() => {
    const tempBusqueda = leerJSON<BusquedaGeneral | null>('catalogoGeneral.busqueda', null)
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

    const tempPaginacion = leerJSON<PaginacionCatalogo | null>('catalogoGeneral.pagination', null)
    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }
  }, [])

  const handleFinish = (values: BusquedaGeneral) => {
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
      estados: busqueda.estado,
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
      estados: busqueda.estado,
    })
  }

  useEffect(() => {
    guardarJSON('catalogoGeneral.busqueda', busqueda)

    if (busqueda.areas === null || busqueda.bodegas === null || busqueda.estado === null) {
      return
    }
    if (
      busqueda.areas.length === 0 ||
      busqueda.bodegas.length === 0 ||
      busqueda.estado.length === 0
    ) {
      return
    }

    buscar({
      pagination,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      estados: busqueda.estado,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const buscar = (params: ParametrosCatalogo = {}) => {
    setCargando(true)

    guardarJSON('catalogoGeneral.pagination', params.pagination)

    InventarioAcualPeticiones.listadoCatalogoGeneral({
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
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-GENERAL']} redirect>
      <Titulo texto="Catálogo General" />
      <Encabezado>Catálogo General</Encabezado>
      <Tarjeta>
        <FormaBusquedaGeneral cargando={cargando} handleFinish={handleFinish} />
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
