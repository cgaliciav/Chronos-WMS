import { useEffect, useState } from 'react'
import { Table, Row, Col, Typography, type TableProps } from 'antd'
import type { Grupo, ParametrosTabla } from 'types/api'
import type { PaginacionTabla, TablaListadosProps } from '../tipos'

export type { TablaListadosProps } from '../tipos'

const TablaListados = ({
  titulo,
  columns,
  movimientoTipoId,
  fnPeticion,
  conteoRefresh,
}: TablaListadosProps) => {
  const [dataTable, setDataTable] = useState<Grupo[]>([])
  const [pagination, setPagination] = useState<PaginacionTabla>({ current: 1, pageSize: 10 })
  const [loading, setLoading] = useState(false)

  const pedirDatos = (params: ParametrosTabla = {}) => {
    setLoading(true)

    fnPeticion({
      ...params,
      movimientoTipoId,
    })
      .then(respData => {
        if (respData !== undefined) {
          setDataTable(respData.results)
          setPagination(respData.pagination)
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (movimientoTipoId !== undefined) {
      if (movimientoTipoId !== 0) {
        pedirDatos({
          pagination,
          sortField: 'grupo.id',
          sortOrder: 'descend',
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientoTipoId])

  useEffect(() => {
    pedirDatos({
      pagination,
      sortField: 'grupo.id',
      sortOrder: 'descend',
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteoRefresh])

  const handleTableChange: TableProps<Grupo>['onChange'] = (paginacion, filters, sorter) => {
    const { field = ['grupo', 'id'], order: sortOrder = 'descend' } = Array.isArray(sorter)
      ? {}
      : sorter

    pedirDatos({
      sortField: Array.isArray(field)
        ? field.slice(field.length - 2).join('.')
        : `grupo.${String(field)}`,
      sortOrder,
      pagination: paginacion,
      filters,
    })
  }

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
          <h3>
            {`TOTAL: ${pagination.total || '-'}${
              pagination.total !== pagination.totalItems ? ' *filtrado' : ''
            } `}
          </h3>
        </Row>
      </Col>
    </Row>
  )

  return (
    <Table<Grupo>
      columns={columns}
      dataSource={dataTable}
      rowKey={record => `${record.id}`}
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

export default TablaListados
