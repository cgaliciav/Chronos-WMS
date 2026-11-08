import { Divider } from 'antd'
import ACL from 'app/auth/ACL'
import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import CatalogoResultados from '../componentes/catalogoResultados'
import FormaBusquedaPorCodigo from './componentes/forma'

const CatalogoPorCodigo = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 12 })
  const [busqueda, setBusqueda] = useState({
    codigosBusqueda: '',
  })
  const [data, setData] = useState([])

  useEffect(() => {
    const tempBusqueda = JSON.parse(localStorage.getItem('catalogoPorCodigo.busqueda'))
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

    const tempPaginacion = JSON.parse(localStorage.getItem('catalogoPorCodigo.pagination'))
    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }

    // setBusqueda(JSON.parse(localStorage.getItem('catalogoPorCodigo.busqueda')))
    // setPagination(JSON.parse(localStorage.getItem('catalogoPorCodigo.pagination')))
  }, [])

  const handleFinish = values => {
    setBusqueda({ ...values })
  }

  const onChange = (pagina, paginaTamanio) => {
    const { current, pageSize, ...restPagination } = pagination
    const tempPaginacion = {
      current: pagina,
      pageSize: paginaTamanio,
      ...restPagination,
    }

    setPagination({ ...tempPaginacion })
    fetch({
      pagination: tempPaginacion,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      estados: busqueda.estado,
    })
  }

  const onShowSizeChange = (actual, paginaTamanio) => {
    // console.log("onShowSizeChange",actual, size);
    // const { pagination } = this.state
    const { current, pageSize, ...restPagination } = pagination

    actual = Math.ceil((pageSize * current) / paginaTamanio)
    // pagination.current = actual
    // pagination.pageSize = size
    const tempPaginacion = {
      current: actual,
      pageSize: paginaTamanio,
      ...restPagination,
    }
    setPagination({ ...tempPaginacion })
    fetch({
      pagination: tempPaginacion,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      estados: busqueda.estado,
    })
  }

  useEffect(() => {
    // console.log('****************** actualizacion busqueda')
    localStorage.setItem('catalogoPorCodigo.busqueda', JSON.stringify(busqueda))

    fetch({
      pagination,
      codigosBusqueda: busqueda.codigosBusqueda?.trim(),
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const fetch = (params = {}) => {
    // console.log('params Fetch   CATALOGO POR CODIGO', params)
    if (params.codigosBusqueda !== undefined) {
      if (params.codigosBusqueda.length === 0) return
      setCargando(true)
      InventarioAcualPeticiones.listadoCatalogoPorCodigo({
        ...params,
      })
        .then(respData => {
          if (respData !== undefined) {
            // console.log('---------------------respData', respData)
            setData(respData.results)
            setPagination(respData.pagination)

            localStorage.setItem(
              'catalogoPorCodigo.pagination',
              JSON.stringify(respData.pagination),
            )
          }
        })
        // El interceptor de axios ya mostró el error.
        .catch(() => {})
        .finally(() => {
          setCargando(false)
          localStorage.setItem('catalogoPorCodigo.pagination', JSON.stringify(pagination))
        })
    }
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-CODIGOS']} redirect>
      <Titulo texto="Catálogo por Código" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Catálogo por Código</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaBusquedaPorCodigo cargando={cargando} handleFinish={handleFinish} />
        </div>
      </div>
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
