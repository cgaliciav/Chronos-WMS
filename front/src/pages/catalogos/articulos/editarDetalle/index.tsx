import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Skeleton, Tabs } from 'antd'
import QueryString from 'query-string'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { notification } from 'helpers/feedback'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import ClavesProducto from 'pages/componentes/claves'
import PreciosProducto from 'pages/componentes/precios'
import Comentarios from 'pages/componentes/comentarios'
import SubirArchivos from 'pages/componentes/subirArchivos'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import ProductoPeticiones from 'services/axios/productos'
import type { ProductoArticulo } from 'pages/componentes/tipos'
import type { InventarioDetalle } from '../../tipos'
import FormaEdicionArticulo, { type ValoresArticulo } from './componentes/formaEdicionArticulo'
import FormaEdicionDisponibilidad, {
  type ValoresDisponibilidad,
} from './componentes/formaEdicionDisponibilidad'

const obtenerValoresInicialesDisponibilidad = (
  inventario: InventarioDetalle,
): ValoresDisponibilidad => ({
  cantidad: inventario.cantidad,
  cantidadAlmacen: inventario.cantidadAlmacen,
  fechaDisponibilidad: dayjs(inventario.fechaDisponibilidad),
  disponible: inventario.disponible,
})

const obtenerValoresIniciales = (
  inventario: InventarioDetalle,
  producto: ProductoArticulo,
): Partial<ValoresArticulo> => {
  const { bodega } = inventario
  const { area, productoPrecios } = producto
  return {
    titulo: producto.titulo,
    descripcion: producto.descripcion,
    cantidad: parseInt(String(inventario.cantidadAlmacen), 10),
    precio: productoPrecios?.[0]?.precio,
    area: area?.id,
    bodega: bodega?.id,
    id: inventario.id ? inventario.id : 0,
  }
}

const EditarArticuloDetalle = () => {
  const [id, setId] = useState<number | string>(0)
  const [cargando, setCargando] = useState(true)
  // `null` hasta que responde el API; si la respuesta llega sin producto se sigue mostrando el esqueleto (F36).
  const [inventarioActual, setInventarioActual] = useState<InventarioDetalle | null>(null)
  const [currentKey, setCurrentKey] = useState('detalles')

  const location = useLocation()

  useEffect(() => {
    const { uid, p } = QueryString.parse(location.search.replace('?', ''))
    if (typeof uid === 'string') {
      setId(uid)
    } else {
      // Sin `?uid` no hay nada que pedir (antes se pedía `/current-inventory/undefined`).
      setCargando(false)
    }
    setCurrentKey(typeof p === 'string' ? p : 'detalles')
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
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }

  const producto = inventarioActual?.producto

  const guardarArticuloDetalles = (valores: ValoresArticulo) => {
    setCargando(true)
    Promise.all([
      InventarioAcualPeticiones.editar({
        inventarioActualId: id,
        bodega: valores.bodega,
      }),
      ProductoPeticiones.editar({
        productoId: producto?.id,
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
  }

  const guardarDisponibilidad = (valores: ValoresDisponibilidad) => {
    setCargando(true)
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

  const disponible = inventarioActual?.disponible

  return (
    <ACL roles={['V-EDITAR-ARTICULOS-DETALLE', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Editar artículo" />
      <Encabezado>Editar artículo</Encabezado>
      <Tarjeta>
        {inventarioActual && producto ? (
          <Tabs
            defaultActiveKey="detalles"
            activeKey={currentKey}
            onChange={setCurrentKey}
            style={{ margin: '8px' }}
            items={[
              {
                key: 'detalles',
                label: 'Detalles',
                children: (
                  <FormaEdicionArticulo
                    guardando={cargando}
                    valoresIniciales={obtenerValoresIniciales(inventarioActual, producto)}
                    habilitado={disponible !== 'baja'}
                    handleFinish={guardarArticuloDetalles}
                    esNuevo={false}
                  />
                ),
              },
              {
                key: 'disponibilidad',
                label: 'Disponibilidad',
                children: (
                  <FormaEdicionDisponibilidad
                    guardando={cargando}
                    valoresIniciales={obtenerValoresInicialesDisponibilidad(inventarioActual)}
                    habilitado
                    handleFinish={guardarDisponibilidad}
                  />
                ),
              },
              // TODO EDITAR (REIMPRIMIR) CODIGOS
              // TODO EDITAR COMENTARIOS
              {
                key: 'fotos',
                label: 'Fotos',
                children: (
                  <SubirArchivos
                    habilitado={disponible !== 'baja'}
                    archivosIdsIniciales={producto.archivos}
                    cargando={cargando}
                    relacion="Producto"
                    relacionId={producto.id}
                  />
                ),
              },
              {
                key: 'caracteristicas',
                label: 'Características',
                children: (
                  <CaracteristicasProducto
                    productoCaracteristicas={producto.productoCaracteristicas}
                    loading={cargando}
                    productoId={producto.id}
                    editar
                    fnActualizar={actualizar}
                  />
                ),
              },
              {
                key: 'codigos',
                label: 'Códigos',
                children: (
                  <ClavesProducto
                    productoClaves={producto.productoClaves}
                    loading={cargando}
                    productoId={producto.id}
                    editar
                    fnActualizar={actualizar}
                  />
                ),
              },
              {
                key: 'precios',
                label: 'Precios',
                children: (
                  <PreciosProducto
                    productoPrecios={producto.productoPrecios}
                    loading={cargando}
                    editar
                    fnActualizar={actualizar}
                  />
                ),
              },
              {
                key: 'comentarios',
                label: 'Comentarios',
                children: (
                  <Comentarios
                    comentarios={producto.comentarios}
                    loading={cargando}
                    disabled={disponible === 'baja'}
                    editar
                    relacion="Producto"
                    relacionId={producto.id}
                    fnActualizar={actualizar}
                  />
                ),
              },
            ]}
          />
        ) : (
          <Skeleton active />
        )}
      </Tarjeta>
    </ACL>
  )
}

export default EditarArticuloDetalle
