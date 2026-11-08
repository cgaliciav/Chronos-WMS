import { useState } from 'react'
import {
  Row,
  Table,
  Typography,
  Popconfirm,
  Tooltip,
  Tag,
  Space,
  Button,
  type TableColumnsType,
} from 'antd'
import { notification } from 'helpers/feedback'
import { PlusOutlined, PrinterOutlined, StopOutlined } from '@ant-design/icons'
import ProductoClavePeticiones from 'services/axios/productoClaves'
import ModalFormaClave, { type ValoresFormaClave } from './formaClaves'
import type { ProductoClaveFila } from './tipos'

export interface ClavesProductoProps {
  productoClaves?: ProductoClaveFila[]
  loading?: boolean
  productoId?: number
  /** Muestra las acciones para agregar, eliminar e imprimir claves. */
  editar?: boolean
  /** Se llama tras agregar o borrar una clave para recargar el producto. */
  fnActualizar?: () => void
}

const ClavesProducto = ({
  productoClaves,
  loading = false,
  productoId,
  editar = false,
  fnActualizar,
}: ClavesProductoProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)

  const eliminarClave = (id: number) => {
    setHabilitadoInterno(false)
    ProductoClavePeticiones.borrar({
      productoId,
      productoClaveId: id,
    })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({ title: 'Clave borrada correctamente' })
          fnActualizar?.()
        }
      })
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
      })
  }

  const handleNuevaClave = () => {
    setMostrarModal(true)
  }

  const agregarClave = async (valores: ValoresFormaClave) => {
    const { modo, clave: barras } = valores
    let resp
    try {
      if (modo === 'autogenerada') {
        resp = await ProductoClavePeticiones.nuevoAutogenerado({
          productoId,
        })
      } else {
        resp = await ProductoClavePeticiones.nuevo({
          productoId,
          productoCodigo: {
            barras,
            barrasTipo: 'Manual',
          },
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

  const columns: TableColumnsType<ProductoClaveFila> = [
    {
      dataIndex: 'barras',
      align: 'right',
      render: (barras: string) => (
        <Typography.Text strong copyable>
          {barras}
        </Typography.Text>
      ),
    },
    { dataIndex: 'barrasTipo' },
  ]

  if (editar) {
    columns.push({
      dataIndex: 'id',
      render: (id: number) => (
        <span>
          <Popconfirm
            title="¿Estas seguro que quieres eliminar el código?"
            onConfirm={() => eliminarClave(id)}
            onCancel={() => {}}
            okText="Sí­"
            cancelText="No"
          >
            <Tooltip title="Eliminar código">
              <Tag color="red">
                <a href="#">
                  <StopOutlined />
                </a>
              </Tag>
            </Tooltip>
          </Popconfirm>
          <Tooltip title="Imprimir código">
            <Tag color="gold">
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                }}
              >
                <PrinterOutlined />
              </a>
            </Tag>
          </Tooltip>
        </span>
      ),
    })
  }

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      {/* TODO MANDAR A IMPRIMIR CLAVES */}
      <Space orientation="vertical" align="end">
        {editar ? (
          <Tooltip title="Agregar característica">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNuevaClave} />
          </Tooltip>
        ) : null}
        <Table
          bordered
          size="small"
          showHeader={false}
          columns={columns}
          dataSource={productoClaves}
          rowKey="id"
          loading={cargando}
        />
      </Space>
      <ModalFormaClave
        cerrarModal={() => {
          setMostrarModal(false)
        }}
        guardando={!habilitadoInterno}
        handleCreate={agregarClave}
        habilitado
        mostrarModal={mostrarModal}
      />
    </Row>
  )
}

export default ClavesProducto
