import React, { useEffect, useState } from 'react'
import { Table, Row, Col } from 'antd'

/**
 * Tabla server-side de los listados de administración (contrato `list-antd`). `fnPeticion` es el método
 * `listado` del servicio; si falla, el interceptor de axios ya notifica el error.
 * Antes era el único componente de clase del negocio (plan 01 fase 3, preparación para React 19).
 */
const TablaGeneral = ({ fnPeticion, columns, titulo, filters = null }) => {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [loading, setLoading] = useState(false)

  const fetch = (params = {}) => {
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
    const registroFinPagina =
      pagination.current * pagination.pageSize > pagination.total
        ? pagination.total
        : pagination.current * pagination.pageSize
    const salida = `Registros ${registroIniciaPagina} al ${registroFinPagina}, de  ${pagination.total} `

    if (pagination.total !== pagination.totalItems) {
      return salida.concat(` filtrados (${pagination.totalItems} totales)`)
    }

    return salida
  }

  const colocarHeader = () => (
    <Row>
      <Col span={8}>
        <h2 className="text-truncate">{titulo}</h2>
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

  const handleTableChange = (paginacion, filtros, sorter) => {
    fetch({
      sortField: sorter.field,
      sortOrder: sorter.order,
      pagination: paginacion,
      filters: filtros,
    })
  }

  return (
    <div className="kit__utils__table">
      <Table
        columns={columns}
        dataSource={data}
        rowKey={record => record.id}
        title={colocarHeader}
        footer={colocarFooter}
        pagination={{
          ...pagination,
          pageSizeOptions: ['10', '20', '50', '100', '500'],
          showSizeChanger: true,
          position: 'both',
        }}
        loading={loading}
        onChange={handleTableChange}
      />
    </div>
  )
}

export default TablaGeneral
