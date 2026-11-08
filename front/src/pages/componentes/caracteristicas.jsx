import React, { useEffect, useState } from 'react'
import { Button, Popconfirm, Row, Table, Tag, Tooltip, Typography, Space } from 'antd'
import { notification } from 'helpers/feedback'
import { PlusOutlined } from '@ant-design/icons'
// import ACL from 'components/cleanui/system/ACL';
import ProductoCaracteristicaPeticiones from 'services/axios/productoCaracteristicas'
import ModalFormaCaracteristica from './formaCaracteristica'

const CaracteristicasProducto = ({
  productoCaracteristicas,
  loading,
  productoId,
  editar,
  fnActualizar,
}) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [esNuevo, setEsNuevo] = useState(true)
  const [valoresEditar, setValoresEditar] = useState({ llave: '', valor: '' })
  const [productoCaracteristicasId, setProductoCaracteristicasId] = useState(0)

  useEffect(() => {}, [])

  const eliminarCaracteristica = id => {
    setHabilitadoInterno(false)
    ProductoCaracteristicaPeticiones.borrar({
      productoId,
      productoCaracteristicasId: id,
    })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({ message: 'Caractetistica borrada correctamente' })
          // TODO ACTUALIZAR LISTA DE CARACTERISTICAS DEL PRODUCTO.
          fnActualizar()
          // productoCaracteristicas = productoCaracteristicas.filter(pc=>pc.id!==id);
        }
      })
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
      })

    // productoId,productoCaracteristicasId
  }

  const modificarCaracteristica = async ({ id, llave, valor }) => {
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

  const agregarCaracteristica = async valores => {
    const { llave, valor } = valores
    setHabilitadoInterno(false)

    let resp
    // console.log("agregarCaracteristica", esNuevo)
    try {
      if (esNuevo) {
        // console.log("agregarCaracteristica NUEVO")
        resp = await ProductoCaracteristicaPeticiones.nuevo({
          productoId,
          productoCaracteristicas: [{ llave, valor }],
        })
      } else {
        // console.log("agregarCaracteristica EDITAR")
        resp = await ProductoCaracteristicaPeticiones.editar({
          productoCaracteristicas: { llave, valor },
          productoCaracteristicasId,
        })
      }
      if (resp !== undefined) {
        fnActualizar()
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }

    setHabilitadoInterno(true)
    setMostrarModal(false)
  }

  const cargando = loading || !habilitadoInterno

  const columns = [
    {
      dataIndex: 'llave',
      align: 'right',
      render: llave => <Typography.Text strong>{llave}</Typography.Text>,
    },
    { dataIndex: 'valor' },
  ]

  if (editar) {
    columns.push({
      dataIndex: 'id',
      render: (id, record) => (
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
                <i className="icmn-pencil2" />
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
                  <i className="icmn-blocked" />
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
      <Space direction="vertical" align="end">
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
            rowKey={() => `${Math.random()}`}
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
