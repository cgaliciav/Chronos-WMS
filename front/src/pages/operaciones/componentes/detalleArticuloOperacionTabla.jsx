import React from 'react'
import { Descriptions, Tag } from 'antd'
import moment from 'moment'
import 'moment/locale/es'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'

const DetalleArticuloOperacioTabla = ({
  movimiento: {
    estatus,
    operacion: {
      id: operacionId,
      fecha: operacionFecha,
      movimientoTipo: { nombre: movimientoTipoNombre },
      usuarios: usuariosResponsables,
      proyecto,
    },
    inventarioActual: {
      bodega: { nombre: bodegaNombre },
      producto: {
        productoClaves,
        productoPrecios,
        titulo: productoTitulo,
        descripcion: productoDescripcion,
        area: { nombre: areaNombre },
      },
    },
    grupos,
    sesion: {
      usuario: { nombre: sesionUsuarioNombre },
    },
  },
}) => {
  moment.locale('es')
  const { nombre: proyectoNombre } = proyecto ?? { nombre: '' }
  const precioObj = productoPrecios.find(pp => pp.precioTipo.id === 2)
  // console.log('precioObj', precioObj)

  return (
    <Descriptions size="small" bordered column={{ lg: 1, md: 1, sm: 1, xs: 1 }}>
      <Descriptions.Item label="Operacion:">{`${movimientoTipoNombre} ${estatus==='finalizado'?'*':''} (#${operacionId})`}</Descriptions.Item>
      <Descriptions.Item label="Fecha:">
        {moment(operacionFecha).format('D-MMM-YY HH:mm')}
      </Descriptions.Item>
      {proyecto ? (
        <Descriptions.Item label="Proyecto:">
          <strong>{proyectoNombre}</strong>
        </Descriptions.Item>
      ) : null}
      {grupos.length > 0 ? (
        <Descriptions.Item label="Grupos:">
          {grupos.map(grp => (
            <Tag key={`${Math.random()}`}>{`${grp.nombre} (${grp.id})`}</Tag>
          ))}
        </Descriptions.Item>
      ) : null}
      <Descriptions.Item label="Clave:">
        {productoClaves[productoClaves.length - 1].barras}
      </Descriptions.Item>
      <Descriptions.Item label="Producto:">{productoTitulo} </Descriptions.Item>
      <Descriptions.Item label="Precio:">
        <strong>{`${formatoMonedaMexico(precioObj?.precio)} ${precioObj?.moneda }`}</strong>{' '}
      </Descriptions.Item>
      <Descriptions.Item label="Area / Almacén: ">
        {areaNombre} / {bodegaNombre}{' '}
      </Descriptions.Item>
      <Descriptions.Item label="Almacenista:">{sesionUsuarioNombre}</Descriptions.Item>
      <Descriptions.Item label="Responsables:">
        {usuariosResponsables.map(usr => usr.nombre).join(',  ')}
      </Descriptions.Item>
      <Descriptions.Item label="Descripcion:">
        <p>{productoDescripcion}</p>
      </Descriptions.Item>
    </Descriptions>
  )
}

export default DetalleArticuloOperacioTabla
