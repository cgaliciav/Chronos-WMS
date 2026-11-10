import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Tag, Spin, Col, Row, Card, Typography, Divider } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import MovimientoPeticiones from 'services/axios/movimientos'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'
import type { Disponibilidad, Movimiento } from 'types/api'
import type { InventarioCatalogo, ProductoCatalogo } from '../tipos'
import Validacion from '../6.validaciones/componentes/validacion'
import Inventariado from '../6.validaciones/componentes/inventariado'

const { Title, Text, Paragraph } = Typography

export type TarjetaProductoProps = InventarioCatalogo & {
  /** Habilita el menú de inventario (catálogo de inventarios). */
  inventory?: boolean
}

const colores: Record<Disponibilidad, string> = {
  disponible: 'green',
  baja: 'red',
  cuarentena: 'orange',
  'no-disponible': 'magenta',
}

const TarjetaProducto = ({
  cantidad,
  disponible,
  fechaDisponibilidad,
  id,
  producto,
  inventory = false,
}: TarjetaProductoProps) => {
  const {
    titulo,
    descripcion,
    productoClaves,
    productoPrecios,
    archivos,
    id: productoId,
    productoValidado,
    productoInventarios,
  }: Partial<ProductoCatalogo> = producto ?? {}
  const [cargando, setCargando] = useState(false)
  // `GET /activity/prior-activity/:id` responde `null` si el inventario no tiene movimientos.
  const [movimiento, setMovimiento] = useState<Partial<Movimiento> | null>({})

  useEffect(() => {
    // obtener ultimo movimiento
    setCargando(true)
    MovimientoPeticiones.obtenerUltimoMovimiento(id)
      .then(resp => {
        if (resp !== undefined) {
          setMovimiento(resp)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setCargando(false)
      })
  }, [id])

  const navigate = useNavigate()

  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    navigate(`/articulos/detalle?uid=${id}`)
  }

  const claveProducto =
    productoClaves && productoClaves.length > 0 ? productoClaves[0].barras : '---'

  // El API anida el tipo de movimiento y el proyecto en la operación.
  const movimientoTipo = movimiento?.operacion?.movimientoTipo
  const proyecto = movimiento?.operacion?.proyecto

  return (
    <>
      <Card
        hoverable
        size="small"
        cover={<ImagenesEnCarrusel archivos={archivos} rutaEnApi="file/catalog/" />}
        title={
          <>
            <Row>
              <Col xs={7} sm={5} xl={4}>
                <Inventariado
                  productoId={productoId}
                  productoInventariado={productoInventarios}
                  disabled={!inventory}
                />
              </Col>
              <Col xs={10} sm={14} xl={16}>
                <Row justify="center">
                  <Link to={`/articulos/detalle?uid=${id}`}>
                    <Title level={4} ellipsis>
                      {' '}
                      {claveProducto.substring(3)}{' '}
                    </Title>
                  </Link>
                </Row>
              </Col>
              <Col xs={7} sm={5} xl={4}>
                <Row justify="end">
                  <Validacion
                    productoId={productoId}
                    productoValidado={productoValidado}
                    disabled
                  />
                </Row>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Title level={3} ellipsis>
                  {' '}
                  {titulo}{' '}
                </Title>
              </Col>
            </Row>
          </>
        }
        actions={[<EyeOutlined key="ver" onClick={onClick} />]}
      >
        <Row justify="end">
          <Title level={4}> {formatoMonedaMexico(productoPrecios?.[0]?.precio)} </Title>
        </Row>
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'ver más' }}>
          {descripcion}
        </Paragraph>
        <Text>Disponible:</Text>
        <Text code>{parseInt(String(cantidad), 10)}</Text>
        <Spin spinning={cargando} size="small">
          {movimiento ? (
            <Row gutter={4} justify="center">
              <Col span={8}>
                {' '}
                <Text type="secondary">
                  {' '}
                  {movimiento.fecha !== undefined
                    ? dayjs(movimiento.fecha).format('D-MMM-YY')
                    : ''}{' '}
                </Text>{' '}
              </Col>
              <Col span={8}>
                {' '}
                <Text strong> {movimientoTipo ? movimientoTipo.nombre : '-'} </Text>
              </Col>
              <Col span={8}>
                {' '}
                <Text> {proyecto ? proyecto.nombre : ''} </Text>{' '}
              </Col>
            </Row>
          ) : (
            <Row />
          )}
        </Spin>

        <Row>
          <Col span={12}>
            <Tag color={colores[disponible]}> {disponible} </Tag>{' '}
          </Col>
          <Col span={12}>
            <Row justify="end">
              {' '}
              <Tag color="Gray"> {claveProducto} </Tag>{' '}
            </Row>
          </Col>
          <Col span={24}>
            <Row justify="center">
              {disponible === 'cuarentena'
                ? `Disponible en: ${dayjs(fechaDisponibilidad).format('D MMM YYYY')}`
                : ''}
            </Row>
          </Col>
        </Row>
      </Card>
      <Divider />
    </>
  )
}

export default TarjetaProducto
