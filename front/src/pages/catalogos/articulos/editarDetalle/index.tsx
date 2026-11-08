import React, { useEffect, useState } from 'react'
import Titulo from 'components/Titulo'
import { useLocation } from 'react-router'
import {
  // Divider,
  Tabs,
} from 'antd'
import { notification } from 'helpers/feedback'
import QueryString from 'query-string'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import ClavesProducto from 'pages/componentes/claves'
import PreciosProducto from 'pages/componentes/precios'
import Comentarios from 'pages/componentes/comentarios'
import SubirArchivos from 'pages/componentes/subirArchivos'
// import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
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
    fechaDisponibilidad: dayjs(),
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
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }
  const obtenerValoresInicialesDisponibilidad = inventario => ({
    cantidad: inventario.cantidad,
    cantidadAlmacen: inventario.cantidadAlmacen,
    fechaDisponibilidad: dayjs(inventario.fechaDisponibilidad),
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
            title: 'Artículo actualizado correctamente.',
          })
        }
      })
      .catch(() => {})
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
            title: 'Artículo actualizado correctamente.',
          })
        }
      })
      .catch(() => {})
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
      <Titulo texto="Editar artículo" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Editar artículo</span>
        </h5>
      </div>
      <div className="card">
        <Tabs defaultActiveKey="detalles" activeKey={currentKey} onChange={setCurrentKey} style={{ margin: '8px' }}
          items={[
            {
              key: 'detalles',
              label: 'Detalles',
              children: (
                <>
            <FormaEdicionArticulo
              guardando={cargando}
              valoresIniciales={obtenerValoresIniciales(inventarioActual)}
              habilitado={disponible !== 'baja'}
              handleFinish={guardarArticuloDetalles}
              esNuevo={false}
            />
                </>
              ),
            },
            {
              key: 'disponibilidad',
              label: 'Disponibilidad',
              children: (
                <>
            {/* <PreciosProducto productoPrecios={productoPrecios} loading={cargando} /> */}
            <FormaEdicionDisponibilidad
              guardando={cargando}
              valoresIniciales={obtenerValoresInicialesDisponibilidad(inventarioActual)}
              habilitado
              handleFinish={guardarDisponibilidad}
            />
                </>
              ),
            },
            /* 
            // TODO EDITAR (REIMPRIMIR) CODIGOS
            // TODO EDITAR COMENTARIOS
          */
            {
              key: 'fotos',
              label: 'Fotos',
              children: (
                <>
            <SubirArchivos
              habilitado={disponible !== 'baja'}
              archivosIdsIniciales={archivos}
              cargando={cargando}
              relacion="Producto"
              relacionId={productoId}
            />
                </>
              ),
            },
            {
              key: 'caracteristicas',
              label: 'Características',
              children: (
                <>
            <CaracteristicasProducto
              productoCaracteristicas={productoCaracteristicas}
              loading={cargando}
              productoId={productoId}
              editar
              fnActualizar={actualizar}
            />
                </>
              ),
            },
            {
              key: 'codigos',
              label: 'Códigos',
              children: (
                <>
            <ClavesProducto
              productoClaves={productoClaves}
              loading={cargando}
              productoId={productoId}
              editar
              fnActualizar={actualizar}
            />
                </>
              ),
            },
            {
              key: 'precios',
              label: 'Precios',
              children: (
                <>
            <PreciosProducto
              productoPrecios={productoPrecios}
              loading={cargando}
              editar
              fnActualizar={actualizar}
            />
                </>
              ),
            },
            {
              key: 'comentarios',
              label: 'Comentarios',
              children: (
                <>
            <Comentarios
              comentarios={comentarios}
              loading={cargando}
              disabled={disponible === 'baja'}
              editar
              relacion="Producto"
              relacionId={productoId}
              fnActualizar={actualizar}
            />
                </>
              ),
            },
          ]}
        />
      </div>
    </ACL>
  )
}

export default EditarArticuloDetalle
