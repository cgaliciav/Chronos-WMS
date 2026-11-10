import { useState, useEffect, type ReactNode } from 'react'
import { Table, Row, Button, type TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import ProductoInventariadoPeticiones from 'services/axios/productoInventariado'
import { AlertTwoTone, FrownTwoTone, MehTwoTone, SmileTwoTone } from '@ant-design/icons'
import type { ProductoInventariadoRegistro, ValidacionInventario } from './tipos'

export interface InventariosProps {
  /** Producto cuyo historial de inventarios se muestra; con `0` no se pide nada. */
  productoId?: number | string
  loading?: boolean
}

const iconosJsx: Record<ValidacionInventario, ReactNode> = {
  inventarioPositivo: <SmileTwoTone style={{ fontSize: '150%' }} twoToneColor="#1B58C1" />,
  inventarioNegativo: <FrownTwoTone style={{ fontSize: '150%' }} twoToneColor="#C11BAB" />,
  'no-revisado': <MehTwoTone style={{ fontSize: '150%' }} twoToneColor="#DDE810" />,
  inventarioViejo: <AlertTwoTone style={{ fontSize: '150%' }} twoToneColor="#E86610" />,
}

const Inventarios = ({ productoId = 0, loading = false }: InventariosProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [listadoInventarios, setListadoInventarios] = useState<ProductoInventariadoRegistro[]>([])

  useEffect(() => {
    if (productoId !== 0) {
      setHabilitadoInterno(false)
      ProductoInventariadoPeticiones.obtenerId<ProductoInventariadoRegistro[]>(productoId)
        .then(resp => {
          if (resp !== undefined) {
            // `GET /item-balance/:id` devuelve la lista de inventarios del producto.
            setListadoInventarios(resp)
          }
        })
        .catch(() => {}) // El interceptor de axios ya mostró el error.
        .finally(() => {
          setHabilitadoInterno(true)
        })
    }
  }, [productoId])

  const cargando = loading || !habilitadoInterno

  const columns: TableColumnsType<ProductoInventariadoRegistro> = [
    {
      dataIndex: 'fecha',
      align: 'right',
      render: (fecha: string) => dayjs(fecha).format('D-MMM-YYYY HH:mm'),
    },
    {
      // Resultado del inventario.
      dataIndex: 'validacion',
      align: 'center',
      render: (validacion: ValidacionInventario) => (
        <Button type="text" icon={iconosJsx[validacion]} />
      ),
    },
    {
      // Manual u operación.
      dataIndex: 'nombre',
      render: (nombre: string) => {
        const [origenInventario] = nombre.split('>>>')
        return origenInventario
      },
    },
    {
      // Encargado.
      dataIndex: ['sesion', 'usuario', 'nombre'],
    },
  ]

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
