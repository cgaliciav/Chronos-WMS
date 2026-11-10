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
  BusquedaPorCodigos,
  InventarioCatalogo,
  PaginacionCatalogo,
  ParametrosCatalogo,
} from '../tipos'
import FormaBusquedaPorCodigo from './componentes/forma'

const CatalogoPorCodigo = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState<PaginacionCatalogo>({
    current: 1,
    total: 0,
    pageSize: 12,
  })
  const [busqueda, setBusqueda] = useState<BusquedaPorCodigos>({
    codigosBusqueda: '',
  })
  const [data, setData] = useState<InventarioCatalogo[]>([])

  useEffect(() => {
    const tempBusqueda = leerJSON<BusquedaPorCodigos | null>('catalogoPorCodigo.busqueda', null)
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

    const tempPaginacion = leerJSON<PaginacionCatalogo | null>('catalogoPorCodigo.pagination', null)
    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }
  }, [])

  const handleFinish = (values: BusquedaPorCodigos) => {
    setBusqueda({ ...values })
  }

  // Al paginar se repite la búsqueda por códigos (antes enviaba los campos de la búsqueda general, que esta
  // página no tiene, y `buscar` la descartaba).
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
      codigosBusqueda: busqueda.codigosBusqueda?.trim(),
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
      codigosBusqueda: busqueda.codigosBusqueda?.trim(),
    })
  }

  useEffect(() => {
    guardarJSON('catalogoPorCodigo.busqueda', busqueda)

    buscar({
      pagination,
      codigosBusqueda: busqueda.codigosBusqueda?.trim(),
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const buscar = (params: ParametrosCatalogo = {}) => {
    if (params.codigosBusqueda !== undefined) {
      if (params.codigosBusqueda.length === 0) return
      setCargando(true)
      InventarioAcualPeticiones.listadoCatalogoPorCodigo({
        ...params,
      })
        .then(respData => {
          if (respData !== undefined) {
            setData(respData.results)
            setPagination(respData.pagination)

            guardarJSON('catalogoPorCodigo.pagination', respData.pagination)
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setCargando(false)
          guardarJSON('catalogoPorCodigo.pagination', pagination)
        })
    }
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-CODIGOS']} redirect>
      <Titulo texto="Catálogo por Código" />
      <Encabezado>Catálogo por Código</Encabezado>
      <Tarjeta>
        <FormaBusquedaPorCodigo cargando={cargando} handleFinish={handleFinish} />
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

export default CatalogoPorCodigo
