import React, { useEffect } from 'react'
import { Row, Col, Spin, Pagination, Divider, Empty } from 'antd'
import TarjetaProducto from './tarjetaProducto'

const CatalogoResultados = ({ data, cargando, pagination, onChange, onShowSizeChange, inventory }) => {
  const showTotal = (total, range) => `${range[0]}-${range[1]} de ${total} totales`

  useEffect(() => {}, [])

  const tarjetas = data.map(item => {
    console.log("tarjetas", item);
    return (
      <Col xl={8} xxl={6} lg={8} md={12} sm={24} xs={24} key={`catdiv-${item.id}`}>
        <TarjetaProducto key={`cat-${item.id}`} {...item} inventory={inventory} />
      </Col>
    )
  })

  return (
    <>
      <Row justify="end">
        <Pagination
          showTotal={showTotal}
          pageSizeOptions={['6', '9', '12', '24', '48']}
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
      <Row justify="end">
        <Pagination
          showTotal={showTotal}
          pageSizeOptions={['6', '9', '12', '24', '48']}
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
