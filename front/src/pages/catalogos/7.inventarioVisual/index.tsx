import { useEffect, useState } from 'react'
import { Divider, Tabs } from 'antd'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { guardarJSON, leerJSON } from 'helpers/storage'
import InventarioActualPeticiones from 'services/axios/inventarioActual'
import FormaBusquedaPorCodigo from '../2.porCodigos/componentes/forma'
import CatalogoResultados from '../componentes/catalogoResultados'
import type {
  BusquedaGeneral,
  BusquedaPorCodigos,
  InventarioCatalogo,
  PaginacionCatalogo,
  ParametrosCatalogo,
} from '../tipos'
import FormaBusquedaGeneral from './componentes/forma'

const CatalogoInventario = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState<PaginacionCatalogo>({
    current: 1,
    total: 0,
    pageSize: 12,
  })
  const [busquedaPalabras, setBusquedaPalabras] = useState<BusquedaGeneral>({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    estado: [],
  })
  const [busquedaCodigos, setBusquedaCodigos] = useState<BusquedaPorCodigos>({
    codigosBusqueda: '',
  })
  const [activeTabKey, setActiveTabKey] = useState('codigos')

  const [data, setData] = useState<InventarioCatalogo[]>([])

  useEffect(() => {
    const tempBusqueda = leerJSON<BusquedaGeneral | null>(
      'catalogoInventarios.busquedaPalabras',
      null,
    )
    const tempPaginacion = leerJSON<PaginacionCatalogo | null>(
      'catalogoInventarios.pagination',
      null,
    )

    // Antes se guardaba en crudo; ahora en JSON (un valor antiguo se ignora y queda la pestaña por defecto).
    const tempActiveKey = leerJSON<string | null>('catalogoInventarios.activeKey', null)

    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }

    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusquedaPalabras(tempBusqueda)
    }
    if (tempActiveKey) setActiveTabKey(tempActiveKey)

    const tempBusquedaCodigos = leerJSON<BusquedaPorCodigos | null>(
      'catalogoInventarios.busquedaCodigos',
      null,
    )
    if (tempBusquedaCodigos !== undefined && tempBusquedaCodigos !== null) {
      setBusquedaCodigos(tempBusquedaCodigos)
    }
  }, [])

  const handleFinishPalabras = (values: BusquedaGeneral) => {
    setBusquedaPalabras({ ...values })
  }

  const onChange = (pagina: number, paginaTamanio: number) => {
    const tempPaginacion = {
      current: pagina,
      pageSize: paginaTamanio,
    }

    setPagination({ ...tempPaginacion })
    fetch({
      pagination: tempPaginacion,
      textoBusqueda: busquedaPalabras.textoBusqueda === null ? '' : busquedaPalabras.textoBusqueda,
      areasIds: busquedaPalabras.areas,
      bodegaIds: busquedaPalabras.bodegas,
      estados: busquedaPalabras.estado,
    })
  }

  const onShowSizeChange = (_actual: number, paginaTamanio: number) => {
    const tempPaginacion = {
      current: 1,
      pageSize: paginaTamanio,
    }
    setPagination({ ...tempPaginacion })
    fetch({
      pagination: tempPaginacion,
      textoBusqueda: busquedaPalabras.textoBusqueda === null ? '' : busquedaPalabras.textoBusqueda,
      areasIds: busquedaPalabras.areas,
      bodegaIds: busquedaPalabras.bodegas,
      estados: busquedaPalabras.estado,
    })
  }

  const fetch = (params: ParametrosCatalogo = {}) => {
    setCargando(true)

    InventarioActualPeticiones.listadoCatalogoGeneral({
      ...params,
      con_foto: false,
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
        guardarJSON('catalogoInventarios.pagination', pagination)
      })
  }

  const onChangeCodigos = (activeKey: string) => {
    setActiveTabKey(activeKey)
    guardarJSON('catalogoInventarios.activeKey', activeKey)
  }

  const handleFinishCodigos = (values: BusquedaPorCodigos) => {
    setBusquedaCodigos({ ...values })
  }

  useEffect(() => {
    if (
      busquedaPalabras.areas === null ||
      busquedaPalabras.bodegas === null ||
      busquedaPalabras.estado === null
    ) {
      return
    }
    if (
      busquedaPalabras.areas.length === 0 ||
      busquedaPalabras.bodegas.length === 0 ||
      busquedaPalabras.estado.length === 0
    ) {
      return
    }
    if (busquedaPalabras.areas.length !== 0 && busquedaPalabras.estado.length !== 0) {
      guardarJSON('catalogoInventarios.busquedaPalabras', busquedaPalabras)
    }

    fetch({
      pagination,
      textoBusqueda: busquedaPalabras.textoBusqueda === null ? '' : busquedaPalabras.textoBusqueda,
      areasIds: busquedaPalabras.areas,
      bodegaIds: busquedaPalabras.bodegas,
      estados: busquedaPalabras.estado,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaPalabras])

  useEffect(() => {
    guardarJSON('catalogoInventarios.busquedaCodigos', busquedaCodigos)

    fetchCodigos({
      pagination: { ...pagination, current: 1 },
      codigosBusqueda: busquedaCodigos.codigosBusqueda?.trim(),
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaCodigos])

  const fetchCodigos = (params: ParametrosCatalogo = {}) => {
    if (params.codigosBusqueda !== undefined) {
      if (params.codigosBusqueda.length === 0) return
      setCargando(true)
      InventarioActualPeticiones.listadoCatalogoPorCodigo({
        ...params,
      })
        .then(respData => {
          if (respData !== undefined) {
            setData(respData.results)
            setPagination(respData.pagination)

            guardarJSON('catalogoInventarios.pagination', respData.pagination)
          }
        })
        .catch(() => {})
        .finally(() => {
          setCargando(false)
          guardarJSON('catalogoInventarios.pagination', pagination)
        })
    }
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-INVENTARIOS']} redirect>
      <Titulo texto="Catálogo Inventarios" />
      <Encabezado>Catálogo Inventarios</Encabezado>
      <Tarjeta>
        <Tabs
          size="large"
          activeKey={activeTabKey}
          onChange={onChangeCodigos}
          items={[
            {
              key: 'palabraClave',
              label: 'Por Palabra Clave',
              children: (
                <FormaBusquedaGeneral cargando={cargando} handleFinish={handleFinishPalabras} />
              ),
            },
            {
              key: 'codigos',
              label: 'Por Códigos',
              children: (
                <FormaBusquedaPorCodigo cargando={cargando} handleFinish={handleFinishCodigos} />
              ),
            },
          ]}
        />
      </Tarjeta>
      <Divider />

      <CatalogoResultados
        data={data}
        cargando={cargando}
        onChange={onChange}
        onShowSizeChange={onShowSizeChange}
        pagination={pagination}
        inventory
      />
    </ACL>
  )
}

export default CatalogoInventario
