import { Divider, Tabs } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import InventarioActualPeticiones from 'services/axios/inventarioActual'
import FormaBusquedaPorCodigo from '../2.porCodigos/componentes/forma'
import CatalogoResultados from '../componentes/catalogoResultados'
import FormaBusquedaGeneral from './componentes/forma'
// import CatalogoResultados from './componentes/resultadosValidaciones'
// import FormaBusquedaGeneral from './componentes/forma'

const CatalogoInventario = () => {
  const [cargando, setCargando] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 12 });
  const [busquedaPalabras, setBusquedaPalabras] = useState({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    estado: [],
  });
  const [busquedaCodigos, setBusquedaCodigos] = useState({
    codigosBusqueda: '',
  });
  const [activeTabKey, setActiveTabKey] = useState('codigos');


  const [data, setData] = useState([])

  useEffect(() => {
    const tempBusqueda = JSON.parse(localStorage.getItem('catalogoInventarios.busquedaPalabras'));
    const tempPaginacion = JSON.parse(localStorage.getItem('catalogoInventarios.pagination'));

    const tempActiveKey = localStorage.getItem('catalogoInventarios.activeKey');

    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }

    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusquedaPalabras(tempBusqueda)
    }
    if(tempActiveKey)
      setActiveTabKey(tempActiveKey);

      const tempBusquedaCodigos = JSON.parse(localStorage.getItem('catalogoInventarios.busquedaCodigos'))
      if (tempBusquedaCodigos !== undefined && tempBusquedaCodigos !== null) {
        setBusquedaCodigos(tempBusquedaCodigos)
      }

  }, [])

  const handleFinishPalabras = values => {
    setBusquedaPalabras({ ...values })
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
      textoBusqueda: busquedaPalabras.textoBusqueda === null ? '' : busquedaPalabras.textoBusqueda,
      areasIds: busquedaPalabras.areas,
      bodegaIds: busquedaPalabras.bodegas,
      estados: busquedaPalabras.estado,
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
      textoBusqueda: busquedaPalabras.textoBusqueda === null ? '' : busquedaPalabras.textoBusqueda,
      areasIds: busquedaPalabras.areas,
      bodegaIds: busquedaPalabras.bodegas,
      estados: busquedaPalabras.estado,
    })
  }

  

  const fetch = (params = {}) => {
    setCargando(true)

    // console.log('params Fetch   CATALOGO', params)
    // localStorage.setItem('catalogoInventarios.pagination', JSON.stringify(params.pagination))

    InventarioActualPeticiones.listadoCatalogoGeneral({
      ...params,
      con_foto: false,
    })
      .then(respData => {
        if (respData !== undefined) {
          // console.log('---------------------respData', respData)
          setData(respData.results)
          setPagination(respData.pagination)

          // localStorage.setItem('catalogoInventarios.pagination', JSON.stringify(respData.pagination))
        }
      })
      .finally(() => {
        setCargando(false)
        localStorage.setItem('catalogoInventarios.pagination', JSON.stringify(pagination))
      })
  }

 


  const onChangeCodigos = (activeKey)=>{
    setActiveTabKey(activeKey);
    localStorage.setItem('catalogoInventarios.activeKey', activeKey);

  }

  const handleFinishCodigos = values => {
    setBusquedaCodigos({ ...values })
  }


  useEffect(() => {
    // console.log('****************** actualizacion busquedaPalabras')

    if (busquedaPalabras.areas === null || busquedaPalabras.bodegas === null || busquedaPalabras.estado === null) {
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
      localStorage.setItem('catalogoInventarios.busquedaPalabras', JSON.stringify(busquedaPalabras))
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
    // console.log('****************** actualizacion busqueda')
    localStorage.setItem('catalogoInventarios.busquedaCodigos', JSON.stringify(busquedaCodigos))

    fetchCodigos({
      pagination:{...pagination,current: 1},
      codigosBusqueda: busquedaCodigos.codigosBusqueda?.trim(),
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaCodigos])


  const fetchCodigos = (params = {}) => {
    // console.log('params Fetch   CATALOGO POR CODIGO', params)
    if (params.codigosBusqueda !== undefined) {
      if (params.codigosBusqueda.length === 0) return
      setCargando(true)
      InventarioActualPeticiones.listadoCatalogoPorCodigo({
        ...params,
      })
        .then(respData => {
          if (respData !== undefined) {
            // console.log('---------------------respData', respData)
            setData(respData.results)
            setPagination(respData.pagination)

            localStorage.setItem(
              'catalogoInventarios.pagination',
              JSON.stringify(respData.pagination),
            )
          }
        })
        .finally(() => {
          setCargando(false)
          localStorage.setItem('catalogoInventarios.pagination', JSON.stringify(pagination))
        })
    }
  }



  return (
    <ACL roles={['ADMINISTRADOR', 'V-CATALOGO-INVENTARIOS']} redirect>
      <Helmet title="Catálogo Inventarios" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Catálogo Inventarios</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <Tabs size="large" activeKey={activeTabKey} onChange={onChangeCodigos}>
            <Tabs.TabPane tab="Por Palabra Clave" key="palabraClave">
              <FormaBusquedaGeneral cargando={cargando} handleFinish={handleFinishPalabras} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Por Códigos" key="codigos">
              <FormaBusquedaPorCodigo cargando={cargando} handleFinish={handleFinishCodigos} />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
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
