import React, { useEffect } from 'react'
import { Row, Col, Spin, Pagination, Divider, Empty } from 'antd'
import TarjetaProductoValidacion from './tarjetaProducto'
// import TarjetaProducto from './tarjetaProducto'

const CatalogoResultados = ({ data, cargando, pagination, onChange, onShowSizeChange }) => {
  const showTotal = (total, range) => `${range[0]}-${range[1]} de ${total} totales`

  useEffect(() => {}, [])

  const tarjetas = data.map(item => {
    return (
      <Col xl={12} xxl={12} lg={12} md={12} sm={24} xs={24} key={`catdiv-${item.id}`}>
        <TarjetaProductoValidacion key={`cat-${item.id}`} {...item} />
      </Col>
    )
  })

  return (
    <>
      <Row type="flex" justify="end">
        <Pagination
          showTotal={showTotal}
          pageSizeOptions={['2','4','6', '9', '12', '24', '48']}
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger
          onShowSizeChange={onShowSizeChange}
          onChange={onChange}
          disabled={cargando}
        />
      </Row>
      <Divider dashed> RESULTADOS </Divider>

      <Spin spinning={cargando}>
        {data?.length === 0 ? (
          <Empty />
        ) : (
          //
          <Row gutter={{ xs: 4, sm: 4, md: 6, lg: 12, xl: 12 }}>{tarjetas}</Row>
        )}
      </Spin>

      <Divider dashed />
      <Row type="flex" justify="end">
        <Pagination
          showTotal={showTotal}
          pageSizeOptions={['2', '4','6', '9', '12', '24', '48']}
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          simple
          showSizeChanger
          onShowSizeChange={onShowSizeChange}
          onChange={onChange}
          disabled={cargando}
        />
      </Row>
    </>
  )
}

export default CatalogoResultados
