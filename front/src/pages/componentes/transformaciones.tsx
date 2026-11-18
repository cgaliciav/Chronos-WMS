import { useEffect, useState } from 'react'
import { Empty, Row, Table, Typography, type TableColumnsType } from 'antd'
import { Link } from 'react-router'
import dayjs from 'dayjs'
import MovimientoPeticiones from 'services/axios/movimientos'
import type { TransformacionArticulo, TransformacionesArticulo } from 'types/api'

export interface TransformacionesProps {
  /** Inventario actual del artículo; con `0` no se pide nada. */
  inventarioActualId: number | string
  loading?: boolean
}

const VACIO: TransformacionesArticulo = { origenes: [], derivados: [] }

/** De qué artículos salió un producto y en qué productos se transformó (decisión 20). */
const Transformaciones = ({ inventarioActualId, loading = false }: TransformacionesProps) => {
  const [pidiendo, setPidiendo] = useState(false)
  const [datos, setDatos] = useState<TransformacionesArticulo>(VACIO)

  useEffect(() => {
    if (inventarioActualId !== 0) {
      setPidiendo(true)
      MovimientoPeticiones.obtenerTransformaciones(inventarioActualId)
        .then(resp => {
          if (resp !== undefined) setDatos(resp)
        })
        .catch(() => {}) // El interceptor de axios ya mostró el error.
        .finally(() => {
          setPidiendo(false)
        })
    }
  }, [inventarioActualId])

  const columnas = (deOrigen: boolean): TableColumnsType<TransformacionArticulo> => [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      render: (fecha: string) => dayjs(fecha).format('D-MMM-YYYY HH:mm'),
      width: 150,
    },
    {
      title: 'Artículo',
      dataIndex: 'titulo',
      render: (titulo: string, fila) => (
        <Link to={`/articulos/detalle?uid=${fila.inventarioActualId}`}>{titulo}</Link>
      ),
    },
    { title: 'Clave', dataIndex: 'codigo', width: 130 },
    {
      title: deOrigen ? 'Unidades usadas' : 'Unidades creadas',
      dataIndex: deOrigen ? 'cantidadOriginal' : 'cantidad',
      align: 'right',
      width: 140,
    },
    { title: 'Producción', dataIndex: 'proyecto' },
  ]

  const tabla = (titulo: string, filas: TransformacionArticulo[], deOrigen: boolean) =>
    filas.length > 0 ? (
      <>
        <Typography.Title level={5}>{titulo}</Typography.Title>
        <Table
          bordered
          size="small"
          rowKey="id"
          pagination={false}
          columns={columnas(deOrigen)}
          dataSource={filas}
          style={{ marginBottom: 16 }}
        />
      </>
    ) : null

  const sinDatos = datos.origenes.length === 0 && datos.derivados.length === 0

  return (
    <Row style={{ width: '90%', margin: 'auto', display: 'block' }}>
      {sinDatos ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            loading || pidiendo
              ? 'Cargando…'
              : 'Este artículo no viene de una transformación ni se ha transformado'
          }
        />
      ) : (
        <>
          {tabla('Se creó a partir de', datos.origenes, true)}
          {tabla('Se transformó en', datos.derivados, false)}
        </>
      )}
    </Row>
  )
}

export default Transformaciones
