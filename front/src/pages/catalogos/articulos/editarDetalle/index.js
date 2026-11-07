import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useLocation } from 'react-router-dom'
import {
  // Divider,
  notification,
  Tabs,
} from 'antd'
import QueryString from 'query-string'
import moment from 'moment'
import 'moment/locale/es'
import ACL from 'components/cleanui/system/ACL'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import ClavesProducto from 'pages/componentes/claves'
import PreciosProducto from 'pages/componentes/precios'
import Comentarios from 'pages/componentes/comentarios'
import SubirArchivos from 'pages/componentes/subirArchivos'
// import ImagenesEnCarrusel from 'pages/componentes/imaganesEnCarrusel'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import ProductoPeticiones from 'services/axios/productos'
import FormaEdicionArticulo from './componentes/formaEdicionArticulo'
import FormaEdicionDisponibilidad from './componentes/formaEdicionDisponibilidad'

const EditarArticuloDetalle = () => {
  const [id, setId] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [inventarioActual, setInventarioActual] = useState({
    cantidad: 0,
    disponible: 'no definido',
    fechaDisponibilidad: moment(),
    bodega: { id: 0, nombre: '------' },
    producto: {
      archivos: [],
      productoPrecios: [],
      productoCaracteristicas: [],
      productoClaves: [],
      area: { id: 0, nombre: '-----' },
      id: 0,
      descripcion: '----------------',
      titulo: '------',
    },
  });
  const [currentKey, setCurrentKey] = useState('detalles');

  const location = useLocation()
  moment.locale('es')

  useEffect(() => {
    const value = QueryString.parse(location.search.replace('?', ''));
    console.log('*******************PARAMS', value);
    setId(value.uid);
    setCurrentKey(value.p??'detalles');
  }, [location])

  useEffect(() => {
    if (id === 0) {
      return
    }
    actualizar()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const actualizar = () => {
    setCargando(true)
    InventarioAcualPeticiones.obtenerId(id)
      .then(resp => {
        if (resp !== undefined) {
          setInventarioActual(resp)
          // console.log('****** INVENTARIO ACTUAL', resp)
        }
      })
      .finally(() => {
        setCargando(false)
      })
  }
  const obtenerValoresInicialesDisponibilidad = inventario => ({
    cantidad: inventario.cantidad,
    cantidadAlmacen: inventario.cantidadAlmacen,
    fechaDisponibilidad: moment(inventario.fechaDisponibilidad),
    disponible: inventario.disponible,
  })

  const obtenerValoresIniciales = inventario => {
    const { producto, bodega } = inventario
    const { area, productoPrecios } = producto
    return {
      titulo: producto.titulo,
      descripcion: producto.descripcion,
      cantidad: parseInt(inventario.cantidadAlmacen, 10),
      precio: productoPrecios[0]?.precio,
      area: area?.id,
      bodega: bodega?.id,
      id: inventario.id ? inventario.id : 0,
    }
  }

  const guardarArticuloDetalles = valores => {
    setCargando(true)
    // inven
    const { producto } = inventarioActual
    Promise.all([
      InventarioAcualPeticiones.editar({
        inventarioActualId: id,
        bodega: valores.bodega,
      }),
      ProductoPeticiones.editar({
        productoId: producto.id,
        titulo: valores.titulo,
        descripcion: valores.descripcion,
        areaId: valores.area,
        productoTipoId: 1,
      }),
    ])
      .then(resp => {
        const [respInv, respProd] = resp

        if (respInv !== undefined && respProd !== undefined) {
          notification.success({
            message: 'Artículo actualizado correctamente.',
          })
        }
      })
      .finally(() => {
        setCargando(false)
      })

    // console.log('guardarArticuloDetalles', valores)
  }

  const guardarDisponibilidad = valores => {
    setCargando(true)
    // inven
    const { fechaDisponibilidad } = valores
    InventarioAcualPeticiones.editar({
      inventarioActualId: id,
      cantidad: valores.cantidad,
      cantidadAlmacen: valores.cantidadAlmacen,
      fechaDisponibilidad: fechaDisponibilidad.format('YYYY-MM-DD HH:mm:ss'),
      disponible: valores.disponible,
    })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({
            message: 'Artículo actualizado correctamente.',
          })
        }
      })
      .finally(() => {
        setCargando(false)
      })
  }

  const {
    archivos,
    productoClaves,
    productoCaracteristicas,
    comentarios,
    productoPrecios,
    id: productoId,
  } = inventarioActual.producto

  const { disponible } = inventarioActual

  return (
    <ACL roles={['V-EDITAR-ARTICULOS-DETALLE', 'ADMINISTRADOR']} redirect>
      <Helmet title="Editar artículo" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar artículo</span>
        </h5>
      </div>
      <div className="card">
        <Tabs defaultActiveKey="detalles" activeKey={currentKey} onChange={(activeKey)=>setCurrentKey(activeKey)} style={{ margin: '8px' }}>
          <Tabs.TabPane tab="Detalles" key="detalles">
            <FormaEdicionArticulo
              guardando={cargando}
              valoresIniciales={obtenerValoresIniciales(inventarioActual)}
              habilitado={disponible !== 'baja'}
              handleFinish={guardarArticuloDetalles}
              esNuevo={false}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Disponibilidad" key="disponibilidad">
            {/* <PreciosProducto productoPrecios={productoPrecios} loading={cargando} /> */}
            <FormaEdicionDisponibilidad
              guardando={cargando}
              valoresIniciales={obtenerValoresInicialesDisponibilidad(inventarioActual)}
              habilitado
              handleFinish={guardarDisponibilidad}
            />
          </Tabs.TabPane>

          {/* 
            // TODO EDITAR (REIMPRIMIR) CODIGOS
            // TODO EDITAR COMENTARIOS
          */}
          <Tabs.TabPane tab="Fotos" key="fotos">
            <SubirArchivos
              habilitado={disponible !== 'baja'}
              archivosIdsIniciales={archivos}
              cargando={cargando}
              relacion="Producto"
              relacionId={productoId}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Características" key="caracteristicas">
            <CaracteristicasProducto
              productoCaracteristicas={productoCaracteristicas}
              loading={cargando}
              productoId={productoId}
              editar
              fnActualizar={actualizar}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Códigos" key="codigos">
            <ClavesProducto
              productoClaves={productoClaves}
              loading={cargando}
              productoId={productoId}
              editar
              fnActualizar={actualizar}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Precios" key="precios">
            <PreciosProducto
              productoPrecios={productoPrecios}
              loading={cargando}
              editar
              fnActualizar={actualizar}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Comentarios" key="comentarios">
            <Comentarios
              comentarios={comentarios}
              loading={cargando}
              disabled={disponible === 'baja'}
              editar
              relacion="Producto"
              relacionId={productoId}
              fnActualizar={actualizar}
            />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </ACL>
  )
}

export default EditarArticuloDetalle
