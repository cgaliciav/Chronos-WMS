import React, { useState } from 'react'
import { Row, Table, Typography, Tooltip, Tag } from 'antd'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'
import ProductoPrecioPeticiones from 'services/axios/productoPrecios'
import ModalFormaPrecios from './formaPrecios'
// import ACL from 'components/cleanui/system/ACL';

const PreciosProducto = ({ productoPrecios, loading, editar, fnActualizar }) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [valoresEditar, setValoresEditar] = useState({ precio: '', precioTipo: { nombre: '' } })
  const [productoPrecioId, setproductoPrecioId] = useState(0)
  // console.log('productoPrecios', productoPrecios);

  const actualizarPrecio = async values => {
    const { precio, moneda } = values
    setHabilitadoInterno(false)
    const resp = await ProductoPrecioPeticiones.editar({
      precio,
      moneda,
      productoPrecioId,
    })

    if (resp !== undefined) {
      fnActualizar()
    }

    setHabilitadoInterno(true)
    setMostrarModal(false)
  }

  const modificarPrecio = ({ id, precio, precioTipo, moneda }) => {
    setproductoPrecioId(id)
    setValoresEditar({ precio, precioTipo, moneda })
    setMostrarModal(true)
  }

  const columns = [
    {
      title: 'Tipo',
      dataIndex: 'precioTipo',
      render: dato => {
        // console.log(dato)
        return dato.nombre
      },
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      align: 'right',
      render: dato => {
        return (
          <Typography.Text strong copyable>
            {formatoMonedaMexico(dato) /* formatter.format(dato) */}
          </Typography.Text>
        )
      },
    },
    {
      title: 'Moneda',
      dataIndex: 'moneda',
      align: 'right',
      render: (dato, record) => {
        console.log({ moneda: dato, record })
        return (
          dato && (
            <Typography.Text strong>
              {dato}
            </Typography.Text>
          )
        )
      },
    },
  ]

  if (editar) {
    columns.push({
      dataIndex: 'id',
      render: (id, record) => (
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
                <i className="icmn-pencil2" />
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
        rowKey={() => `${Math.random()}`}
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
