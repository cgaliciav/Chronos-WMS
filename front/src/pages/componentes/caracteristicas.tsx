import { useState } from 'react'
import {
  Button,
  Popconfirm,
  Row,
  Table,
  Tag,
  Tooltip,
  Typography,
  Space,
  type TableColumnsType,
} from 'antd'
import { notification } from 'helpers/feedback'
import { EditOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'
import ProductoCaracteristicaPeticiones from 'services/axios/productoCaracteristicas'
import type { ProductoCaracteristica } from 'types/api'
import ModalFormaCaracteristica, { type ValoresFormaCaracteristica } from './formaCaracteristica'

export interface CaracteristicasProductoProps {
  productoCaracteristicas?: ProductoCaracteristica[]
  loading?: boolean
  productoId?: number
  /** Muestra las acciones para agregar, modificar y eliminar características. */
  editar?: boolean
  /** Se llama tras agregar, modificar o borrar una característica para recargar el producto. */
  fnActualizar?: () => void
}

const CaracteristicasProducto = ({
  productoCaracteristicas,
  loading = false,
  productoId,
  editar = false,
  fnActualizar,
}: CaracteristicasProductoProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [esNuevo, setEsNuevo] = useState(true)
  const [valoresEditar, setValoresEditar] = useState<ValoresFormaCaracteristica>({
    llave: '',
    valor: '',
  })
  const [productoCaracteristicasId, setProductoCaracteristicasId] = useState(0)

  const eliminarCaracteristica = (id: number) => {
    setHabilitadoInterno(false)
    ProductoCaracteristicaPeticiones.borrar({
      productoId,
      productoCaracteristicasId: id,
    })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({ title: 'Caractetistica borrada correctamente' })
          fnActualizar?.()
        }
      })
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
      })
  }

  const modificarCaracteristica = ({ id, llave, valor }: ProductoCaracteristica) => {
    setProductoCaracteristicasId(id)
    setEsNuevo(false)
    setValoresEditar({ llave, valor })
    setMostrarModal(true)
  }

  const handleNuevaCaracteristica = () => {
    setEsNuevo(true)
    setValoresEditar({ llave: '', valor: '' })
    setMostrarModal(true)
  }

  const agregarCaracteristica = async (valores: ValoresFormaCaracteristica) => {
    const { llave, valor } = valores
    setHabilitadoInterno(false)

    let resp
    try {
      if (esNuevo) {
        resp = await ProductoCaracteristicaPeticiones.nuevo({
          productoId,
          productoCaracteristicas: [{ llave, valor }],
        })
      } else {
        resp = await ProductoCaracteristicaPeticiones.editar({
          productoCaracteristicas: { llave, valor },
          productoCaracteristicasId,
        })
      }
      if (resp !== undefined) {
        fnActualizar?.()
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }

    setHabilitadoInterno(true)
    setMostrarModal(false)
  }

  const cargando = loading || !habilitadoInterno

  const columns: TableColumnsType<ProductoCaracteristica> = [
    {
      dataIndex: 'llave',
      align: 'right',
      render: (llave: string) => <Typography.Text strong>{llave}</Typography.Text>,
    },
    { dataIndex: 'valor' },
  ]

  if (editar) {
    columns.push({
      dataIndex: 'id',
      render: (id: number, record) => (
        <span>
          <Tooltip title="Modificar característica">
            <Tag color="blue">
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  modificarCaracteristica(record)
                }}
              >
                <EditOutlined />
              </a>
            </Tag>
          </Tooltip>
          <Popconfirm
            title="¿Estas seguro que quieres eliminar la característica?"
            onConfirm={() => eliminarCaracteristica(id)}
            onCancel={() => {}}
            okText="Sí­"
            cancelText="No"
          >
            <Tooltip title="Eliminar característica">
              <Tag color="red">
                <a href="#">
                  <StopOutlined />
                </a>
              </Tag>
            </Tooltip>
          </Popconfirm>
        </span>
      ),
    })
  }

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      {/* TODO AGREGAR FORMA PARA NUEVAS CARACTERISTICAS Y BORRAR EXISTENTES */}
      <Space orientation="vertical" align="end">
        {editar ? (
          <Tooltip title="Agregar característica">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNuevaCaracteristica} />
          </Tooltip>
        ) : null}
        <div>
          <Table
            bordered
            size="small"
            showHeader={false}
            columns={columns}
            dataSource={productoCaracteristicas}
            rowKey="id"
            loading={cargando}
          />
        </div>
      </Space>

      <ModalFormaCaracteristica
        cerrarModal={() => {
          setMostrarModal(false)
        }}
        guardando={!habilitadoInterno}
        habilitado
        esNuevo={esNuevo}
        handleCreate={agregarCaracteristica}
        mostrarModal={mostrarModal}
        valoresIniciales={valoresEditar}
      />
    </Row>
  )
}

export default CaracteristicasProducto
