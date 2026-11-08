import { Row, Col, Spin, Pagination, Divider, Empty } from 'antd'
import type { CatalogoResultadosProps } from '../../componentes/catalogoResultados'
import TarjetaProductoValidacion from './tarjetaProducto'

const CatalogoResultados = ({
  data,
  cargando,
  pagination,
  onChange,
  onShowSizeChange,
}: Omit<CatalogoResultadosProps, 'inventory'>) => {
  const showTotal = (total: number, range: [number, number]) =>
    `${range[0]}-${range[1]} de ${total} totales`

  const tarjetas = data.map(item => (
    <Col xl={12} xxl={12} lg={12} md={12} sm={24} xs={24} key={`catdiv-${item.id}`}>
      <TarjetaProductoValidacion key={`cat-${item.id}`} {...item} />
    </Col>
  ))

  return (
    <>
      <Row justify="end">
        <Pagination
          showTotal={showTotal}
          pageSizeOptions={['2', '4', '6', '9', '12', '24', '48']}
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
          <Row gutter={{ xs: 4, sm: 4, md: 6, lg: 12, xl: 12 }}>{tarjetas}</Row>
        )}
      </Spin>

      <Divider dashed />
      <Row justify="end">
        <Pagination
          showTotal={showTotal}
          pageSizeOptions={['2', '4', '6', '9', '12', '24', '48']}
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
