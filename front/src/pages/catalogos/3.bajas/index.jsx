import { Divider } from 'antd'
import ACL from 'app/auth/ACL'
import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import CatalogoResultados from '../componentes/catalogoResultados'
import FormaBusquedaBajas from './componentes/forma'

const CatalogoBajas = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 12 })
  const [busqueda, setBusqueda] = useState({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    estado: ['baja'],
  })
  const [data, setData] = useState([])

  useEffect(() => {
    const tempBusqueda = JSON.parse(localStorage.getItem('catalogoBajas.busqueda'))
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

    const tempPaginacion = JSON.parse(localStorage.getItem('catalogoBajas.pagination'))
    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }
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
    localStorage.setItem('catalogoBajas.busqueda', JSON.stringify(busqueda))

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

    fetch({
      pagination,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      estados: busqueda.estado,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const fetch = (params = {}) => {
    setCargando(true)

    // console.log('params Fetch   CATALOGO', params)
    localStorage.setItem('catalogoBajas.pagination', JSON.stringify(params.pagination))

    InventarioAcualPeticiones.listadoCatalogoBajas({
      ...params,
    })
      .then(respData => {
        if (respData !== undefined) {
          // console.log('---------------------respData', respData)
          setData(respData.results)
          setPagination(respData.pagination)

          // localStorage.setItem('catalogoBajas.pagination', JSON.stringify(respData.pagination))
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
        // localStorage.setItem('catalogoBajas.pagination', JSON.stringify(pagination))
      })
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-BAJAS']} redirect>
      <Titulo texto="Catálogo Bajas" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Catálogo Bajas</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaBusquedaBajas cargando={cargando} handleFinish={handleFinish} />
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

export default CatalogoBajas
