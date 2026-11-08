import { useState } from 'react'
import { Row, Table, Typography, Tooltip, Tag, type TableColumnsType } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'
import ProductoPrecioPeticiones from 'services/axios/productoPrecios'
import type { ProductoPrecio } from 'types/api'
import ModalFormaPrecios, {
  type ValoresFormaPrecio,
  type ValoresInicialesPrecio,
} from './formaPrecios'

export interface PreciosProductoProps {
  productoPrecios?: ProductoPrecio[]
  loading?: boolean
  /** Muestra la acción para modificar cada precio. */
  editar?: boolean
  /** Se llama tras modificar un precio para recargar el producto. */
  fnActualizar?: () => void
}

const PreciosProducto = ({
  productoPrecios,
  loading = false,
  editar = false,
  fnActualizar,
}: PreciosProductoProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [valoresEditar, setValoresEditar] = useState<ValoresInicialesPrecio>({
    precio: '',
    precioTipo: { nombre: '' },
  })
  const [productoPrecioId, setProductoPrecioId] = useState(0)

  const actualizarPrecio = async (values: ValoresFormaPrecio) => {
    const { precio, moneda } = values
    setHabilitadoInterno(false)
    try {
      const resp = await ProductoPrecioPeticiones.editar({
        precio,
        moneda,
        productoPrecioId,
      })

      if (resp !== undefined) {
        fnActualizar?.()
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }

    setHabilitadoInterno(true)
    setMostrarModal(false)
  }

  const modificarPrecio = ({ id, precio, precioTipo, moneda }: ProductoPrecio) => {
    setProductoPrecioId(id)
    setValoresEditar({ precio, precioTipo, moneda })
    setMostrarModal(true)
  }

  const columns: TableColumnsType<ProductoPrecio> = [
    {
      title: 'Tipo',
      dataIndex: 'precioTipo',
      render: (dato: ProductoPrecio['precioTipo']) => dato.nombre,
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      align: 'right',
      render: (dato: ProductoPrecio['precio']) => (
        <Typography.Text strong copyable>
          {formatoMonedaMexico(dato)}
        </Typography.Text>
      ),
    },
    {
      title: 'Moneda',
      dataIndex: 'moneda',
      align: 'right',
      render: (dato: ProductoPrecio['moneda']) =>
        dato && <Typography.Text strong>{dato}</Typography.Text>,
    },
  ]

  if (editar) {
    columns.push({
      dataIndex: 'id',
      render: (_id: number, record) => (
        <span>
          <Tooltip title="Modificar precio">
            <Tag color="blue">
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  modificarPrecio(record)
                }}
              >
                <EditOutlined />
              </a>
            </Tag>
          </Tooltip>
        </span>
      ),
    })
  }

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      {/* TODO AGREGAR METODO PARA EDITAR PRECIOS */}
      <Table
        bordered
        size="small"
        showHeader={false}
        columns={columns}
        dataSource={productoPrecios}
        rowKey="id"
        loading={loading}
      />
      <ModalFormaPrecios
        cerrarModal={() => {
          setMostrarModal(false)
        }}
        guardando={!habilitadoInterno}
        habilitado
        handleCreate={actualizarPrecio}
        mostrarModal={mostrarModal}
        valoresIniciales={valoresEditar}
      />
    </Row>
  )
}

export default PreciosProducto
