import React, { useState } from 'react'
import { Row, Table, Typography, Popconfirm, Tooltip, Tag, notification, Space, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import ProductoClavePeticiones from 'services/axios/productoClaves'
import ModalFormaClave from './formaClaves'
// import ACL from 'components/cleanui/system/ACL';

const ClavesProducto = ({ productoClaves, loading, productoId, editar, fnActualizar }) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)

  const eliminarClave = id => {
    setHabilitadoInterno(false)
    ProductoClavePeticiones.borrar({
      productoId,
      productoClaveId: id,
    })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({ message: 'Clave borrada correctamente' })

          // ACTUALIZAR LISTA DE CARACTERISTICAS DEL PRODUCTO.
          fnActualizar()
        }
      })
      .finally(() => {
        setHabilitadoInterno(true)
      })
  }

  const handleNuevaClave = () => {
    setMostrarModal(true)
  }

  const agregarClave = async valores => {
    const { modo, clave: barras } = valores
    let resp
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
      fnActualizar()
    }

    setHabilitadoInterno(true)
    setMostrarModal(false)
  }

  const cargando = loading || !habilitadoInterno

  const columns = [
    {
      dataIndex: 'barras',
      align: 'right',
      render: barras => (
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
      render: id => (
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
                  <i className="icmn-blocked" />
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
                <i className="icmn-printer" />
              </a>
            </Tag>
          </Tooltip>
        </span>
      ),
    })
  }

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      {/* TODO MANDAR A IMPRIMIR CLAVES
       */}
      <Space direction="vertical" align="end">
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
          rowKey={() => `${Math.random()}`}
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
