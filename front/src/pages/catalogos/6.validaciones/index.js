import { Divider } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import CatalogoResultados from './componentes/resultadosValidaciones'
import FormaBusquedaGeneral from './componentes/forma'

const CatalogoValidaciones = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 12 })
  const [busqueda, setBusqueda] = useState({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    estado: [],
  })
  const [data, setData] = useState([])

  useEffect(() => {
    const tempBusqueda = JSON.parse(localStorage.getItem('catalogoValidaciones.busqueda'))
    const tempPaginacion = JSON.parse(localStorage.getItem('catalogoValidaciones.pagination'))

    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }

    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

  }, [])

  const handleFinish = values => {
    setBusqueda({ ...values })
  }

  const onChange = (pagina, paginaTamanio) => {
    // const { pageSize } = pagination
    const tempPaginacion = {
      current: pagina,
      pageSize: paginaTamanio,
      // ...restPagination,
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
    // const { current, pageSize, ...restPagination } = pagination

    // actual = Math.ceil((pageSize * current) / paginaTamanio)
    // pagination.current = actual
    // pagination.pageSize = size
    const tempPaginacion = {
      current: 1,
      pageSize: paginaTamanio,
      // ...restPagination,
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
    if (
      busqueda.areas.length !== 0 &&
      busqueda.estado.length !== 0
    ) {
      localStorage.setItem('catalogoValidaciones.busqueda', JSON.stringify(busqueda))
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
    // localStorage.setItem('catalogoValidaciones.pagination', JSON.stringify(params.pagination))

    InventarioAcualPeticiones.listadoCatalogoGeneral({
      ...params,
      con_foto:true,
    })
      .then(respData => {
        if (respData !== undefined) {
          // console.log('---------------------respData', respData)
          setData(respData.results)
          setPagination(respData.pagination)

          // localStorage.setItem('catalogoValidaciones.pagination', JSON.stringify(respData.pagination))
        }
      })
      .finally(() => {
        setCargando(false)
        localStorage.setItem('catalogoValidaciones.pagination', JSON.stringify(pagination))
      })
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-VALIDACIONES']} redirect>
      <Helmet title="Catálogo Validaciones" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Catálogo Validaciones</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaBusquedaGeneral cargando={cargando} handleFinish={handleFinish} />
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

export default CatalogoValidaciones;
