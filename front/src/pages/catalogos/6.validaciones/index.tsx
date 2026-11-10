import { useEffect, useState } from 'react'
import { Divider } from 'antd'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { guardarJSON, leerJSON } from 'helpers/storage'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import type {
  BusquedaGeneral,
  InventarioCatalogo,
  PaginacionCatalogo,
  ParametrosCatalogo,
} from '../tipos'
import CatalogoResultados from './componentes/resultadosValidaciones'
import FormaBusquedaGeneral from './componentes/forma'

const CatalogoValidaciones = () => {
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
    const tempBusqueda = leerJSON<BusquedaGeneral | null>('catalogoValidaciones.busqueda', null)
    const tempPaginacion = leerJSON<PaginacionCatalogo | null>(
      'catalogoValidaciones.pagination',
      null,
    )

    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }

    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }
  }, [])

  const handleFinish = (values: BusquedaGeneral) => {
    setBusqueda({ ...values })
  }

  const onChange = (pagina: number, paginaTamanio: number) => {
    const tempPaginacion = {
      current: pagina,
      pageSize: paginaTamanio,
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
    const tempPaginacion = {
      current: 1,
      pageSize: paginaTamanio,
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
    if (busqueda.areas.length !== 0 && busqueda.estado.length !== 0) {
      guardarJSON('catalogoValidaciones.busqueda', busqueda)
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

    InventarioAcualPeticiones.listadoCatalogoGeneral({
      ...params,
      con_foto: true,
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
        guardarJSON('catalogoValidaciones.pagination', pagination)
      })
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-VALIDACIONES']} redirect>
      <Titulo texto="Catálogo Validaciones" />
      <Encabezado>Catálogo Validaciones</Encabezado>
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

export default CatalogoValidaciones
