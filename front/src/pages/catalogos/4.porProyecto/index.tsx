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
import FormaBusquedaPorProyecto from './componentes/forma'
import { parametrosBusquedaProyecto } from './parametros'

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
    tipoMovimiento: [],
  })
  const [data, setData] = useState<InventarioCatalogo[]>([])

  useEffect(() => {
    const tempBusqueda = leerJSON<BusquedaPorProyecto | null>('catalogoProyecto.busqueda', null)
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

    const tempPaginacion = leerJSON<PaginacionCatalogo | null>('catalogoProyecto.pagination', null)
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
    buscar(parametrosBusquedaProyecto(busqueda, tempPaginacion))
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
    buscar(parametrosBusquedaProyecto(busqueda, tempPaginacion))
  }

  useEffect(() => {
    guardarJSON('catalogoProyecto.busqueda', busqueda)

    const { areas, bodegas, proyecto, tipoMovimiento } = busqueda
    if (
      areas === null ||
      bodegas === null ||
      proyecto === null ||
      tipoMovimiento === null ||
      areas === undefined ||
      bodegas === undefined ||
      proyecto === undefined ||
      tipoMovimiento === undefined
    ) {
      return
    }
    // `tipoMovimiento` es un id (Select simple); solo el estado inicial `[]` lo deja vacío.
    if (
      areas.length === 0 ||
      bodegas.length === 0 ||
      (Array.isArray(tipoMovimiento) && tipoMovimiento.length === 0)
    ) {
      return
    }

    buscar(parametrosBusquedaProyecto(busqueda, pagination))

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const buscar = (params: ParametrosCatalogo = {}) => {
    setCargando(true)

    guardarJSON('catalogoProyecto.pagination', params.pagination)

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
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-PROYECTO']} redirect>
      <Titulo texto="Catálogo por Proyecto" />
      <Encabezado>Catálogo por Proyecto</Encabezado>
      <Tarjeta>
        <FormaBusquedaPorProyecto cargando={cargando} handleFinish={handleFinish} />
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
