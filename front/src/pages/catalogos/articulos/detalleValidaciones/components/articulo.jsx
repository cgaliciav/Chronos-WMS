import React from 'react'
import { Row, Space, Tag, Typography } from 'antd'
import Validacion from 'pages/catalogos/6.validaciones/componentes/validacion'
// import moment from 'moment'
// import { formatoMonedaMexico } from 'helpers/funcionesExtras'

// import ACL from 'components/cleanui/system/ACL';

const ArticuloDatos = ({
  producto: { /* productoPrecios, */ productoClaves, area, descripcion, titulo, id:productoId, productoValidado=null },
  inventarioActual: { bodega, cantidad, /* disponible, fechaDisponibilidad */ },
}) => {
  // const colores = {
  //   disponible: 'green',
  //   baja: 'red',
  //   cuarentena: 'orange',
  //   'no-disponible': 'magenta',
  // }

  // const precio=productoPrecios?.find(pp=>(pp.precioTipo.id===2))?.precio;

  return (
    <>
      <Row justify="end" style={{ marginTop: '15px' }}>
        <Space>
          <Validacion productoId={productoId} productoValidado={productoValidado} />
          {/* <Tag color={colores[disponible]}>{disponible}</Tag>
          {disponible === 'cuarentena'
            ? ` hasta: ${dayjs(fechaDisponibilidad).format('D MMM YYYY')}  `
            : '  '} */}
          <Tag style={{ fontSize: '130%' }}> {productoClaves.length > 0 ? productoClaves[0].barras : '---'} </Tag>
        </Space>
      </Row>
      <Typography.Title level={3}> {titulo} </Typography.Title>
      <Typography.Title level={3}>
        {' '}
        {`${parseInt(cantidad, 10)} ${parseInt(cantidad, 10) !== 1 ? 'piezas' : 'pieza'}`}{' '}
      </Typography.Title>
      {/* <Typography.Title level={3}>
        {' '}
        {`${formatoMonedaMexico(precio)}`}
      </Typography.Title> */}
      <Typography.Paragraph>{descripcion}</Typography.Paragraph>
      <br />
      <Typography.Text strong>Almacén:</Typography.Text>{' '}
      <Typography.Text>{bodega.nombre}</Typography.Text>
      <br />
      <Typography.Text strong>Área:</Typography.Text>{' '}
      <Typography.Text>{area.nombre}</Typography.Text>
      <br />
    </>
  )
}

export default ArticuloDatos
