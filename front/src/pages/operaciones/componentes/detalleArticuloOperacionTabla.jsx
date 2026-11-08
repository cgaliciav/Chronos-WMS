import React from 'react'
import { Descriptions, Tag } from 'antd'
import dayjs from 'dayjs'
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
  const { nombre: proyectoNombre } = proyecto ?? { nombre: '' }
  const precioObj = productoPrecios.find(pp => pp.precioTipo.id === 2)
  // console.log('precioObj', precioObj)

  return (
    <Descriptions
      size="small"
      bordered
      column={{ lg: 1, md: 1, sm: 1, xs: 1 }}
      // antd 6: `items` en lugar de `Descriptions.Item` como hijos.
      items={[
        {
          key: 'operacion',
          label: 'Operacion:',
          children: `${movimientoTipoNombre} ${estatus === 'finalizado' ? '*' : ''} (#${operacionId})`,
        },
        { key: 'fecha', label: 'Fecha:', children: dayjs(operacionFecha).format('D-MMM-YY HH:mm') },
        proyecto && { key: 'proyecto', label: 'Proyecto:', children: <strong>{proyectoNombre}</strong> },
        grupos.length > 0 && {
          key: 'grupos',
          label: 'Grupos:',
          children: grupos.map(grp => <Tag key={grp.id}>{`${grp.nombre} (${grp.id})`}</Tag>),
        },
        { key: 'clave', label: 'Clave:', children: productoClaves[productoClaves.length - 1].barras },
        { key: 'producto', label: 'Producto:', children: productoTitulo },
        {
          key: 'precio',
          label: 'Precio:',
          children: <strong>{`${formatoMonedaMexico(precioObj?.precio)} ${precioObj?.moneda}`}</strong>,
        },
        { key: 'area', label: 'Area / Almacén: ', children: `${areaNombre} / ${bodegaNombre}` },
        { key: 'almacenista', label: 'Almacenista:', children: sesionUsuarioNombre },
        {
          key: 'responsables',
          label: 'Responsables:',
          children: usuariosResponsables.map(usr => usr.nombre).join(',  '),
        },
        { key: 'descripcion', label: 'Descripcion:', children: <p>{productoDescripcion}</p> },
      ].filter(Boolean)}
    />
  )
}

export default DetalleArticuloOperacioTabla
