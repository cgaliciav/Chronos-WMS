import React, { useState, useEffect } from 'react'
import { Table, Row, Button } from 'antd'
import dayjs from 'dayjs'
import ProductoInventariadoPeticiones from 'services/axios/productoInventariado'
import { AlertTwoTone, FrownTwoTone, MehTwoTone, SmileTwoTone } from '@ant-design/icons'

// import ACL from 'app/auth/ACL';

const Inventarios = ({ productoId = 0, loading }) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [listadoInventarios, setListadoInventarios] = useState([])

  useEffect(() => {
    if (productoId !== 0) {
      setHabilitadoInterno(false);
      ProductoInventariadoPeticiones.obtenerId(productoId)
        .then(resp => {
          console.log('---------------setListadoInventarios',resp)
          if (resp !== undefined) {
            setListadoInventarios(resp)
          }
        })
        .catch(() => {}) // El interceptor de axios ya mostró el error.
        .finally(() => {
          setHabilitadoInterno(true)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId])

  const cargando = loading || !habilitadoInterno

  const iconosJsx = {
    inventarioPositivo: <SmileTwoTone style={{ fontSize: '150%' }} twoToneColor="#1B58C1" />,
    inventarioNegativo: <FrownTwoTone style={{ fontSize: '150%' }} twoToneColor="#C11BAB" />,
    'no-revisado': <MehTwoTone style={{ fontSize: '150%' }} twoToneColor="#DDE810" />,
    inventarioViejo: <AlertTwoTone style={{ fontSize: '150%' }} twoToneColor="#E86610" />,
  }

  const columns = [
    {
      dataIndex: 'fecha',
      align: 'right',
      render: fecha => {
        return dayjs(fecha).format('D-MMM-YYYY HH:mm')
      },
    },
    {
      // tipo de movimiento
      dataIndex: 'validacion',
      align: 'center',
      render: validacion => <Button type="text" icon={iconosJsx[validacion]} />,
    },
    {
      // manual u operacion
      dataIndex: 'nombre',
      render: nombre => {
        const [origenInventario] = nombre.split('>>>')
        return origenInventario
      },
    },
    {
      // encargado
      dataIndex: ['sesion', 'usuario', 'nombre'],
    },
  ]

  // console.log("Inventarios",listadoInventarios);

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      <Table
        bordered
        size="small"
        showHeader={false}
        columns={columns}
        dataSource={listadoInventarios}
        rowKey={record => `${record.id}`}
        loading={cargando}
      />
    </Row>
  )
}

export default Inventarios
