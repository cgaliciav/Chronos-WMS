import React, { useEffect, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { Tag, Spin, Col, Row, Card, Typography, Divider } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import moment from 'moment'
import 'moment/locale/es'
import MovimientoPeticiones from 'services/axios/movimientos'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'
import Validacion from '../6.validaciones/componentes/validacion'
import Inventariado from '../6.validaciones/componentes/inventariado'

const { Title, Text, Paragraph } = Typography

const TarjetaProducto = ({
  cantidad,
  disponible,
  fechaDisponibilidad,
  id,
  producto: {
    titulo,
    descripcion,
    productoClaves,
    productoPrecios,
    archivos,
    id: productoId,
    productoValidado,
    productoInventarios,
  },
  inventory=false 
  //   movimiento,
}) => {
  const [cargando, setCargando] = useState(false)
  const [movimiento, setMovimiento] = useState({})

  useEffect(() => {
    moment.locale('es')

    // obtener ultimo movimiento
    setCargando(true)
    MovimientoPeticiones.obtenerUltimoMovimiento(id)
      .then(resp => {
        if (resp !== undefined) {
          // console.log(`ULTIMO MOVIMIENTO ${id}:`, resp)
          setMovimiento(resp)
        }
      })
      .finally(() => {
        setCargando(false)
      })
  }, [id])

  const history = useHistory()

  const onClick = e => {
    e.preventDefault()
    history.push(`/articulos/detalle?uid=${id}`)
  }

  // Intl.NumberFormat().resolvedOptions().loca
  // const formatter = new Intl.NumberFormat('es-MX', {
  //   style: 'currency',
  //   currency: 'MXN',
  //   useGrouping: true,

  // })

  const claveProducto = productoClaves?.length > 0 ? productoClaves[0].barras : '---'

  const colores = {
    disponible: 'green',
    baja: 'red',
    cuarentena: 'orange',
    'no-disponible': 'magenta',
  }

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
                <Row justify='end'>
                  <Validacion productoId={productoId} productoValidado={productoValidado} disabled />
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
          <Title level={4}>
            {' '}
            {formatoMonedaMexico(
              productoPrecios[0].precio,
            ) /* formatter.format(productoPrecios[0].precio) */}{' '}
          </Title>
        </Row>
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'ver más' }}>
          {descripcion}
        </Paragraph>
        <Text>Disponible:</Text>
        <Text code>{parseInt(cantidad, 10)}</Text>
        <Spin spinning={cargando} size="small">
          {movimiento !== undefined ? (
            <Row gutter={4} justify="center">
              <Col span={8}>
                {' '}
                <Text type="secondary">
                  {' '}
                  {movimiento.fecha !== undefined
                    ? moment(movimiento.fecha).format('D-MMM-YY')
                    : ''}{' '}
                </Text>{' '}
              </Col>
              <Col span={8}>
                {' '}
                <Text strong>
                  {' '}
                  {movimiento.movimientoTipo !== undefined
                    ? movimiento.movimientoTipo?.nombre
                    : '-'}{' '}
                </Text>
              </Col>
              <Col span={8}>
                {' '}
                <Text>
                  {' '}
                  {movimiento.proyecto !== undefined ? movimiento.proyecto?.nombre : ''}{' '}
                </Text>{' '}
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
                ? `Disponible en: ${moment(fechaDisponibilidad).format('D MMM YYYY')}`
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
