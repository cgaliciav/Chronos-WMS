import { Divider } from 'antd'
import ACL from 'app/auth/ACL'
import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import CatalogoResultados from '../componentes/catalogoResultados'
import FormaBusquedaPorProyecto from './componentes/forma'

const CatalogoGeneral = () => {
  const [cargando, setCargando] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 12 })
  const [busqueda, setBusqueda] = useState({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    proyecto: [],
    tipoMovimiento:[],
  })
  const [data, setData] = useState([])

  useEffect(() => {
    const tempBusqueda = JSON.parse(localStorage.getItem('catalogoProyecto.busqueda'))
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

    const tempPaginacion = JSON.parse(localStorage.getItem('catalogoProyecto.pagination'))
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
      proyectoId: busqueda.proyecto,
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
      proyectoId: busqueda.proyecto,
    })
  }

  useEffect(() => {
    // console.log('****************** actualizacion busqueda',busqueda)
    localStorage.setItem('catalogoProyecto.busqueda', JSON.stringify(busqueda))

    if (busqueda.areas === null || busqueda.bodegas === null || busqueda.proyecto === null || busqueda.tipoMovimiento === null ||
      busqueda.areas === undefined || busqueda.bodegas === undefined || busqueda.proyecto === undefined || busqueda.tipoMovimiento === undefined) {
      return;
    }
    if (
      busqueda.areas.length === 0 ||
      busqueda.bodegas.length === 0 ||
      busqueda.tipoMovimiento.length === 0
    ) {
      return;
    }

    fetch({
      pagination,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      proyectoId: busqueda.proyecto,
      movimientosTipoIds:busqueda.tipoMovimiento,

    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const fetch = (params = {}) => {
    setCargando(true)

    // console.log('params Fetch   CATALOGO-PROYECTO', params)
    localStorage.setItem('catalogoProyecto.pagination', JSON.stringify(params.pagination))

    InventarioAcualPeticiones.listadoCatalogoProyectos({
      ...params,
    })
      .then(respData => {
        if (respData !== undefined) {
          // console.log('---------------------respData', respData)
          setData(respData.results)
          setPagination(respData.pagination)

          // localStorage.setItem('catalogoProyecto.pagination', JSON.stringify(respData.pagination))
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
        // localStorage.setItem('catalogoProyecto.pagination', JSON.stringify(pagination))
      })
  }

  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-PROYECTO']} redirect>
      <Titulo texto="Catálogo por Proyecto" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Catálogo por Proyecto</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaBusquedaPorProyecto cargando={cargando} handleFinish={handleFinish} />
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

export default CatalogoGeneral
