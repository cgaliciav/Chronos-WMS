import { Row, Col, Spin, Pagination, Divider, Empty } from 'antd'
import type { InventarioCatalogo, PaginacionCatalogo } from '../tipos'
import TarjetaProducto from './tarjetaProducto'

export interface CatalogoResultadosProps {
  data: InventarioCatalogo[]
  cargando: boolean
  pagination: PaginacionCatalogo
  onChange: (pagina: number, paginaTamanio: number) => void
  onShowSizeChange: (actual: number, paginaTamanio: number) => void
  /** Habilita el menú de inventario de cada tarjeta (catálogo de inventarios). */
  inventory?: boolean
}

const CatalogoResultados = ({
  data,
  cargando,
  pagination,
  onChange,
  onShowSizeChange,
  inventory,
}: CatalogoResultadosProps) => {
  const showTotal = (total: number, range: [number, number]) =>
    `${range[0]}-${range[1]} de ${total} totales`

  const tarjetas = data.map(item => (
    <Col
      xl={8}
      xxl={6}
      lg={8}
      md={12}
      sm={24}
      xs={24}
      key={`catdiv-${item.id}`}
      style={{ display: 'flex' }}
    >
      <TarjetaProducto key={`cat-${item.id}`} {...item} inventory={inventory} />
    </Col>
  ))

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
          <Row gutter={[{ xs: 2, sm: 2, md: 3, lg: 6, xl: 6 }, 12]}>{tarjetas}</Row>
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
