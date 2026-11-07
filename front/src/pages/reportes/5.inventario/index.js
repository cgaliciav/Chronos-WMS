import React, { useEffect, useState } from 'react'
import ACL from 'components/cleanui/system/ACL'
import { Helmet } from 'react-helmet'
import { Divider } from 'antd'
import FormaInventario from '../componentes/formaInventario'

const ReporteInventario = () => {
  const [cargando, setCargando] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10});
  const [busqueda, setBusqueda] = useState({
    textoBusqueda: '',
    areas: [],
    bodegas: [],
    estado: [],
  })



  useEffect(() => {
    const tempBusqueda = JSON.parse(localStorage.getItem('reporteInventario.busqueda'));
    const tempPaginacion = JSON.parse(localStorage.getItem('reporteInventario.pagination'));

    if (tempPaginacion !== undefined && tempPaginacion !== null) {
      setPagination(tempPaginacion)
    }

    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      setBusqueda(tempBusqueda)
    }

  }, [])

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
    if (busqueda.areas.length !== 0 && busqueda.estado.length !== 0) {
      localStorage.setItem('catalogoInventarios.busqueda', JSON.stringify(busqueda))
    }

    fetch({
      pagination,
      textoBusqueda: busqueda.textoBusqueda === null ? '' : busqueda.textoBusqueda,
      areasIds: busqueda.areas,
      bodegaIds: busqueda.bodegas,
      estados: busqueda.estado,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);


  
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



  const handleFormFinish = values =>{
    console.log(values);
  }


  return (
    <ACL roles={['ADMINISTRADOR', 'V-REPORTE-INVENTARIO']} redirect>
      <Helmet title="Catálogo General" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Reporte Inventario</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaInventario 
            handleFinish={handleFormFinish}
            cargando={cargando}

          />

          {/* FORMA DE BUSQUEDA */}
        </div>
      </div>
      <Divider />

      {/* COMPONETE DE TABLA PARA MOSTRAR RESULTADOS */}
    </ACL>
  )
}

export default ReporteInventario
