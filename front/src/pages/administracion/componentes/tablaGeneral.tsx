import { useEffect, useState } from 'react'
import { Table, Row, Col, Typography } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import type { PaginacionAntd, ParametrosTabla } from 'types/api'
import type { PeticionListado } from '../tipos'

/** Paginación local: `total`/`totalItems` faltan hasta la primera respuesta del API. */
type EstadoPaginacion = Pick<PaginacionAntd, 'current' | 'pageSize'> &
  Partial<Pick<PaginacionAntd, 'total' | 'totalItems'>>

interface PropsTablaGeneral<T> {
  fnPeticion: PeticionListado<T>
  columns: TableColumnsType<T>
  titulo: string
  filters?: ParametrosTabla['filters']
}

/**
 * Tabla server-side de los listados de administración (contrato `list-antd`). `fnPeticion` es el método
 * `listado` del servicio; si falla, el interceptor de axios ya notifica el error.
 * Antes era el único componente de clase del negocio (plan 01 fase 3, preparación para React 19).
 */
const TablaGeneral = <T extends { id: number }>({
  fnPeticion,
  columns,
  titulo,
  filters,
}: PropsTablaGeneral<T>) => {
  const [data, setData] = useState<T[]>([])
  const [pagination, setPagination] = useState<EstadoPaginacion>({ current: 1, pageSize: 10 })
  const [loading, setLoading] = useState(false)

  const fetch = (params: ParametrosTabla = {}) => {
    setLoading(true)
    fnPeticion({ ...params })
      .then(respData => {
        setData(respData.results)
        setPagination({ ...respData.pagination })
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch({ filters, pagination })
    // Solo al montar, como el componentDidMount anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const colocarFooter = () => {
    const registroIniciaPagina = pagination.current * pagination.pageSize - pagination.pageSize + 1
    const finPagina = pagination.current * pagination.pageSize
    const registroFinPagina =
      pagination.total !== undefined && finPagina > pagination.total ? pagination.total : finPagina
    const salida = `Registros ${registroIniciaPagina} al ${registroFinPagina}, de  ${pagination.total} `

    if (pagination.total !== pagination.totalItems) {
      return salida.concat(` filtrados (${pagination.totalItems} totales)`)
    }

    return salida
  }

  const colocarHeader = () => (
    <Row>
      <Col span={8}>
        <Typography.Title level={2} ellipsis>
          {titulo}
        </Typography.Title>
      </Col>
      <Col span={8}>
        <Row justify="end" />
      </Col>
      <Col span={8}>
        <Row justify="center">
          <h3>{`TOTAL: ${pagination.total || '-'}${
            pagination.total !== pagination.totalItems ? ' *filtrado' : ''
          } `}</h3>
        </Row>
      </Col>
    </Row>
  )

  const handleTableChange: TableProps<T>['onChange'] = (paginacion, filtros, sorter) => {
    // Las columnas usan `sorter: true` (orden simple): antd entrega un único `SorterResult`.
    const orden = Array.isArray(sorter) ? sorter[0] : sorter
    fetch({
      sortField: orden?.field === undefined ? undefined : String(orden.field),
      sortOrder: orden?.order,
      pagination: paginacion,
      filters: filtros,
    })
  }

  return (
    <Table<T>
      columns={columns}
      dataSource={data}
      rowKey={record => record.id}
      title={colocarHeader}
      footer={colocarFooter}
      pagination={{
        ...pagination,
        pageSizeOptions: ['10', '20', '50', '100', '500'],
        showSizeChanger: true,
      }}
      loading={loading}
      onChange={handleTableChange}
    />
  )
}

export default TablaGeneral
