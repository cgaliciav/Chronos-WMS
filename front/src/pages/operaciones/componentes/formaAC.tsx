// Forma de alta y compra: cantidad, título, descripción, foto, precio inicial, características y comentarios
// del artículo nuevo (los datos generales de la factura están en el grupo).
import { useState } from 'react'
import { Button, Tabs, Steps, Spin } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import FormaEdicionArticulo, {
  type ValoresArticulo,
} from 'pages/catalogos/articulos/editarDetalle/componentes/formaEdicionArticulo'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import Comentarios from 'pages/componentes/comentarios'
import SubirArchivos from 'pages/componentes/subirArchivos'
import GrupoPeticiones from 'services/axios/grupos'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'
import type { Area, Bodega, Numerico, Producto } from 'types/api'
import type { FormaNuevoItemACProps } from '../tipos'

export type { FormaNuevoItemACProps } from '../tipos'

/** Inventario del artículo que se está dando de alta (vacío hasta guardar los datos generales). */
interface InventarioFormaAC {
  id?: number
  cantidad?: Numerico
  disponible?: string
  fechaDisponibilidad?: Dayjs | string
  bodega?: Pick<Bodega, 'id' | 'nombre'>
  producto?: Partial<Omit<Producto, 'area'>> & { area?: Pick<Area, 'id' | 'nombre'> }
}

/** Valores de `FormaEdicionArticulo` con `esNuevo`. */

const inventarioVacio = (): InventarioFormaAC => ({
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
})

const FormaNuevoItemAC = ({
  handleFinish,
  cargando,
  proyectoId,
  usuariosIds,
  grupoId,
  movimientoTipoId,
}: FormaNuevoItemACProps) => {
  const [guardando, setGuardando] = useState(false)
  const [current, setCurrent] = useState(0)
  const [conteoNuevo, setConteoNuevo] = useState(0)

  const [inventarioActual, setInventarioActual] = useState<InventarioFormaAC>(inventarioVacio)

  const terminar = () => {
    setCurrent(0)
    handleFinish()
    setInventarioActual(inventarioVacio())
    setConteoNuevo(conteoNuevo + 1)
  }

  const actualizar = () => {
    setGuardando(true)
    InventarioAcualPeticiones.obtenerId(`${inventarioActual.id}`)
      .then(resp => {
        if (resp !== undefined) {
          setInventarioActual(resp)
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setGuardando(false)
      })
  }

  const crearArticulo = (valores: ValoresArticulo) => {
    // Crea el producto y su inventario actual; al no mandar `productoCodigos`, el API autogenera un código.
    setGuardando(true)

    const {
      titulo,
      cantidad: cantidadTexto,
      precio: precioTexto,
      area: areaId,
      bodega: bodegaId,
      descripcion,
      moneda,
    } = valores
    // El formulario puede entregar cantidad y precio como texto (p. ej. tras vaciarlo para el siguiente artículo).
    const cantidad = Number(cantidadTexto)
    const productoPrecioOriginal = Number(precioTexto)

    GrupoPeticiones.agregarMovimientoCompra({
      grupoId,
      cantidad,
      movimientoTipoId, // compra o alta
      proyectoId,
      usuariosIds,
      precioUnitario: productoPrecioOriginal,
      precioTotal: productoPrecioOriginal * cantidad,
      bodegaId,
      titulo,
      descripcion,
      areaId,
      moneda,
      productoTipoId: 1, // siempre es producto "regular"
      productoCaracteristicas: [], // se crea sin características
      productoPrecioOriginal,
    })
      .then(resp => {
        if (resp !== undefined) {
          setInventarioActual(resp.inventarioActual ?? {})
          setCurrent(current + 1)
        }
      })
      .catch(() => {})
      .finally(() => {
        setGuardando(false)
      })
  }

  const siguiente = () => {
    setCurrent(current + 1)
  }

  const {
    archivos,
    productoCaracteristicas,
    comentarios,
    id: productoId,
  } = inventarioActual.producto ?? {}

  return (
    <>
      <Steps
        current={current}
        items={[
          { key: 'A', title: 'Datos generales' },
          { key: 'B', title: 'Fotos' },
          { key: 'C', title: 'Caracteristicas' },
          { key: 'D', title: 'Comentarios' },
        ]}
      />
      <Spin spinning={guardando}>
        <Tabs
          activeKey={`${current}`}
          style={{ margin: '8px' }}
          tabBarStyle={{ display: 'none' }}
          items={[
            {
              key: '0',
              label: 'Detalles',
              disabled: current !== 0,
              children: (
                <FormaEdicionArticulo
                  guardando={guardando}
                  habilitado
                  handleFinish={crearArticulo}
                  esNuevo
                  textoBoton="Guardar y siguiente"
                  limpiarNuevo={conteoNuevo}
                />
              ),
            },
            {
              key: '1',
              label: 'Fotos',
              disabled: current !== 1,
              children: (
                <>
                  <SubirArchivos
                    habilitado
                    archivosIdsIniciales={archivos}
                    cargando={cargando}
                    relacion="Producto"
                    relacionId={productoId}
                  />
                  <Button type="primary" onClick={siguiente}>
                    Siguiente
                  </Button>
                  <Button type="primary" ghost onClick={terminar}>
                    Terminar
                  </Button>
                </>
              ),
            },
            {
              key: '2',
              label: 'Características',
              disabled: current !== 2,
              children: (
                <>
                  <CaracteristicasProducto
                    productoCaracteristicas={productoCaracteristicas}
                    loading={cargando}
                    productoId={productoId}
                    editar
                    fnActualizar={actualizar}
                  />
                  <Button type="primary" onClick={siguiente}>
                    Siguiente
                  </Button>
                  <Button type="primary" ghost onClick={terminar}>
                    Terminar
                  </Button>
                </>
              ),
            },
            {
              key: '3',
              label: 'Comentarios',
              disabled: current !== 3,
              children: (
                <>
                  <Comentarios
                    comentarios={comentarios}
                    loading={cargando}
                    disabled={false}
                    editar
                    relacion="Producto"
                    relacionId={productoId}
                    fnActualizar={actualizar}
                  />
                  <Button type="primary" ghost onClick={terminar}>
                    Terminar
                  </Button>
                </>
              ),
            },
          ]}
        />
      </Spin>
    </>
  )
}

export default FormaNuevoItemAC
